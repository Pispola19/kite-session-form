# public_dam_gateway — Setup AWS (NON deployare senza autorizzazione)

Setup runbook per pubblicare la Lambda + API Gateway HTTP che inoltrano alla
coda SQS FIFO `kite-sessions-dam.fifo`. Tutti i comandi sono in **dry-mode di
documentazione**: vanno eseguiti SOLO dopo autorizzazione esplicita.

Tutti i comandi assumono:

- account AWS: `318323257447`
- regione: `us-east-1`
- coda SQS: `arn:aws:sqs:us-east-1:318323257447:kite-sessions-dam.fifo`
- profilo AWS CLI configurato (`aws configure --profile dam-deploy` o env vars)
- runtime Lambda: `python3.12`
- nome funzione: `dam-ingress`
- nome API Gateway: `dam-public-ingress`
- origine FE consentita: `https://<github-user>.github.io` (sostituire prima del deploy)

> **Sicurezza**: la role di Lambda riceve solo `sqs:SendMessage` sulla coda
> specifica + `AWSLambdaBasicExecutionRole`. Niente `Receive`/`Delete`. Il
> consumer (relay locale) ha credenziali distinte.

---

## File presenti in questa cartella

| File | Scopo |
|---|---|
| `lambda_function.py` | Codice handler Lambda (Python 3.12) |
| `iam_policy_lambda_sqs.json` | Policy inline `sqs:SendMessage` (resource pinned) |
| `test_payload.json` | Payload di esempio per smoke (NON marker di test) |
| `README_SETUP.md` | Questo file |

Eventuali file generati ad hoc dai comandi sotto (`trust_policy.json`,
`function.zip`, `apigw_route.json`) NON sono committati e vanno gestiti
fuori repo (o in `.gitignore`).

---

## 0. Variabili (esporta in shell)

```bash
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="318323257447"
export SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/${AWS_ACCOUNT_ID}/kite-sessions-dam.fifo"
export SQS_QUEUE_ARN="arn:aws:sqs:us-east-1:${AWS_ACCOUNT_ID}:kite-sessions-dam.fifo"
export ROLE_NAME="dam-ingress-execution-role"
export FUNCTION_NAME="dam-ingress"
export API_NAME="dam-public-ingress"
export ALLOWED_ORIGIN="https://<github-user>.github.io"   # SOSTITUIRE
export AWS_PROFILE="dam-deploy"                            # opzionale
```

---

## 1. Crea la role IAM Lambda

Trust policy (genera file temporaneo):

```bash
cat > /tmp/dam_ingress_trust_policy.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
JSON
```

Crea la role:

```bash
aws iam create-role \
  --role-name "${ROLE_NAME}" \
  --assume-role-policy-document file:///tmp/dam_ingress_trust_policy.json \
  --description "Execution role for ${FUNCTION_NAME} (SendMessage to SQS FIFO)"
```

Allega la managed policy basica (CloudWatch Logs):

```bash
aws iam attach-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
```

Allega la policy inline `sqs:SendMessage` (file presente in repo):

```bash
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "dam-ingress-sqs-send" \
  --policy-document file://iam_policy_lambda_sqs.json
```

Verifica:

```bash
aws iam list-attached-role-policies --role-name "${ROLE_NAME}"
aws iam list-role-policies          --role-name "${ROLE_NAME}"
```

Annota l'ARN della role:

```bash
ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)
echo "ROLE_ARN=${ROLE_ARN}"
```

> Attendere ~10 secondi dopo `create-role` prima del passo 2 (propagazione IAM).

---

## 2. Crea/aggiorna la Lambda

Prepara il pacchetto:

```bash
cd public_dam_gateway
zip -j /tmp/function.zip lambda_function.py
```

Crea la funzione:

```bash
aws lambda create-function \
  --function-name "${FUNCTION_NAME}" \
  --runtime python3.12 \
  --role "${ROLE_ARN}" \
  --handler lambda_function.lambda_handler \
  --timeout 10 \
  --memory-size 256 \
  --architectures arm64 \
  --zip-file fileb:///tmp/function.zip \
  --environment "Variables={SQS_QUEUE_URL=${SQS_QUEUE_URL},SQS_REGION=${AWS_REGION},MESSAGE_GROUP_ID=kite-data,ALLOWED_ORIGIN=${ALLOWED_ORIGIN},MAX_BODY_BYTES=65536,EXPECTED_SRC=form_v1,LOG_LEVEL=INFO}" \
  --description "Public ingress to SQS FIFO dam (kite-sessions-dam.fifo)"
```

Aggiornamenti successivi del codice (idempotenti):

```bash
zip -j /tmp/function.zip lambda_function.py
aws lambda update-function-code \
  --function-name "${FUNCTION_NAME}" \
  --zip-file fileb:///tmp/function.zip
```

Aggiornamento env vars (atomico):

```bash
aws lambda update-function-configuration \
  --function-name "${FUNCTION_NAME}" \
  --environment "Variables={SQS_QUEUE_URL=${SQS_QUEUE_URL},SQS_REGION=${AWS_REGION},MESSAGE_GROUP_ID=kite-data,ALLOWED_ORIGIN=${ALLOWED_ORIGIN},MAX_BODY_BYTES=65536,EXPECTED_SRC=form_v1,LOG_LEVEL=INFO}"
```

Annota l'ARN funzione:

```bash
FUNCTION_ARN=$(aws lambda get-function \
  --function-name "${FUNCTION_NAME}" \
  --query 'Configuration.FunctionArn' --output text)
echo "FUNCTION_ARN=${FUNCTION_ARN}"
```

Smoke invocazione diretta (senza API Gateway):

```bash
aws lambda invoke \
  --function-name "${FUNCTION_NAME}" \
  --cli-binary-format raw-in-base64-out \
  --payload "$(jq -c '{body: (.|tostring), isBase64Encoded:false, requestContext:{http:{method:"POST"}}, headers:{"content-type":"application/json","origin":"'"${ALLOWED_ORIGIN}"'"}}' test_payload.json)" \
  /tmp/lambda_response.json
cat /tmp/lambda_response.json
```

> Il `test_payload.json` è privo di marker di test → la Lambda chiamerebbe
> `SendMessage` reale. Per smoke a costo zero su SQS, passa
> `--payload` con `session_id="test_dryrun_001"` per attivare il filtro
> `forbidden_test_payload`.

---

## 3. Crea API Gateway HTTP API + CORS

Crea l'API:

```bash
API_ID=$(aws apigatewayv2 create-api \
  --name "${API_NAME}" \
  --protocol-type HTTP \
  --description "Public ingress to dam (POST /dam/submit -> Lambda)" \
  --cors-configuration "AllowOrigins=${ALLOWED_ORIGIN},AllowMethods=POST,OPTIONS,AllowHeaders=Content-Type,MaxAge=3600,AllowCredentials=false" \
  --query 'ApiId' --output text)
echo "API_ID=${API_ID}"
```

Integrazione Lambda (proxy):

```bash
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id "${API_ID}" \
  --integration-type AWS_PROXY \
  --integration-uri "${FUNCTION_ARN}" \
  --integration-method POST \
  --payload-format-version "2.0" \
  --timeout-in-millis 10000 \
  --query 'IntegrationId' --output text)
echo "INTEGRATION_ID=${INTEGRATION_ID}"
```

Route `POST /dam/submit`:

```bash
aws apigatewayv2 create-route \
  --api-id "${API_ID}" \
  --route-key "POST /dam/submit" \
  --target "integrations/${INTEGRATION_ID}"
```

> CORS preflight `OPTIONS` è gestito automaticamente da API Gateway HTTP API
> grazie a `--cors-configuration` (non serve creare una route OPTIONS).

Permesso di invocazione Lambda da API Gateway:

```bash
aws lambda add-permission \
  --function-name "${FUNCTION_NAME}" \
  --statement-id "apigw-invoke-${API_ID}" \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*/dam/submit"
```

Stage di deploy `prod` (auto-deploy):

```bash
aws apigatewayv2 create-stage \
  --api-id "${API_ID}" \
  --stage-name prod \
  --auto-deploy \
  --description "Production stage" \
  --default-route-settings "ThrottlingBurstLimit=50,ThrottlingRateLimit=25"
```

URL pubblico finale:

```bash
PUBLIC_URL="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/prod/dam/submit"
echo "PUBLIC_URL=${PUBLIC_URL}"
```

> Annota questo URL: andrà in `<meta name="dam-public-url">` di
> `index.html` in un PR FE separato (NON in questo step).

Smoke da terminale (richiede autorizzazione):

```bash
# (a) preflight CORS
curl -sS -i -X OPTIONS "${PUBLIC_URL}" \
  -H "Origin: ${ALLOWED_ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# (b) payload di test che DEVE essere scartato (no SQS write)
curl -sS -i -X POST "${PUBLIC_URL}" \
  -H "Content-Type: application/json" \
  -H "Origin: ${ALLOWED_ORIGIN}" \
  -d '{"message_id":"msg_0123456789abcdef0123456789abcdef_dry","session_id":"test_dryrun_001","technical_id":"test_dryrun_001","event_ts":"2026-04-25T11:00:00+02:00","src":"form_v1"}'
# atteso: 200 {ok:false, discarded:true, reason:"forbidden_test_payload"}
```

> Solo dopo aver visto `discarded:true` come risposta, e SOLO dopo
> autorizzazione, eseguire l'invio reale con `test_payload.json`:
> ```bash
> curl -sS -i -X POST "${PUBLIC_URL}" \
>   -H "Content-Type: application/json" \
>   -H "Origin: ${ALLOWED_ORIGIN}" \
>   --data @test_payload.json
> ```
> Atteso: `200 {ok:true, durable:true, dam_received:true, message_id:"..."}`.

---

## 4. Throttling & osservabilità (consigliati)

Throttling per route (più restrittivo del default):

```bash
aws apigatewayv2 update-stage \
  --api-id "${API_ID}" \
  --stage-name prod \
  --route-settings '{"POST /dam/submit":{"ThrottlingBurstLimit":20,"ThrottlingRateLimit":10}}'
```

Log retention CloudWatch (default è "Never expire"):

```bash
aws logs put-retention-policy \
  --log-group-name "/aws/lambda/${FUNCTION_NAME}" \
  --retention-in-days 30
```

Allarme errori Lambda (≥1 errore in 5 min):

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "${FUNCTION_NAME}-errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --dimensions "Name=FunctionName,Value=${FUNCTION_NAME}"
```

---

## 5. Verifica fine-deploy (smoke completo)

```bash
# salute API Gateway
curl -sS -o /dev/null -w "%{http_code}\n" -X OPTIONS "${PUBLIC_URL}" \
  -H "Origin: ${ALLOWED_ORIGIN}" \
  -H "Access-Control-Request-Method: POST"
# atteso: 204 o 200

# smoke filtro test (no scrittura)
curl -sS "${PUBLIC_URL}" \
  -H "Content-Type: application/json" \
  -H "Origin: ${ALLOWED_ORIGIN}" \
  -d '{"message_id":"msg_0123456789abcdef0123456789abcdef_dry","session_id":"test_dryrun_001","technical_id":"test_dryrun_001","event_ts":"2026-04-25T11:00:00+02:00","src":"form_v1"}'

# log Lambda recenti
aws logs tail "/aws/lambda/${FUNCTION_NAME}" --since 5m --follow
```

---

## 6. Rollback / cleanup

Disabilitare temporaneamente la route (soft):

```bash
# rimuovi target dalla route -> 404 verso FE; il resto resta intatto
ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "${API_ID}" \
  --query "Items[?RouteKey=='POST /dam/submit'].RouteId | [0]" --output text)
aws apigatewayv2 delete-route --api-id "${API_ID}" --route-id "${ROUTE_ID}"
```

Distruzione completa (hard, ordine sicuro):

```bash
# 1) delete API Gateway
aws apigatewayv2 delete-api --api-id "${API_ID}"

# 2) delete Lambda
aws lambda delete-function --function-name "${FUNCTION_NAME}"

# 3) detach + remove role policies
aws iam delete-role-policy   --role-name "${ROLE_NAME}" --policy-name dam-ingress-sqs-send
aws iam detach-role-policy   --role-name "${ROLE_NAME}" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
aws iam delete-role          --role-name "${ROLE_NAME}"
```

> **NON** distruggere mai la coda SQS `kite-sessions-dam.fifo`: contiene
> messaggi in attesa di drenaggio dal relay. Il rollback hard tocca solo
> ingresso pubblico, non la diga.

---

## 7. Cosa NON fare in questo step

- ❌ NON modificare `app.js`, `index.html`, Google submit, WhatsApp.
- ❌ NON modificare `worker.py`, `relay.py`, `relay_service.py`, `dam_ingest.py`.
- ❌ NON deployare prima dell'autorizzazione esplicita (questo file è solo
  documentazione; nessuno step di questo README va eseguito automaticamente).
- ❌ NON committare `function.zip`, `trust_policy.json`, log temporanei.
- ❌ NON usare `ALLOWED_ORIGIN=*` in produzione: settare il dominio FE esatto.
- ❌ NON inserire credenziali AWS in env Lambda: usare la role IAM.

## 8. Prossimo step (deploy controllato)

Su esplicita autorizzazione:

1. Eseguire i comandi delle sezioni 1–3.
2. Eseguire smoke 5 (filtro test marker, niente scrittura SQS).
3. Riportare `${PUBLIC_URL}` ottenuto.
4. SOLO dopo, valutare 1 invio con `test_payload.json` reale.
5. SOLO dopo verifica relay/worker, aprire un PR FE separato per
   `<meta name="dam-public-url">` in `index.html` e `submitPayload` in `app.js`.

Ogni passaggio richiede un'autorizzazione separata.
