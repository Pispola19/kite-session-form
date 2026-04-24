(() => {
  const data = window.MONITOR_DATA || {};

  function drawBarChart(canvasId, points, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 640;
    const cssHeight = 280;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (!points.length) {
      ctx.fillStyle = "#66757b";
      ctx.font = "16px sans-serif";
      ctx.fillText("No data", 20, 32);
      return;
    }

    const padding = { top: 18, right: 16, bottom: 54, left: 32 };
    const chartWidth = cssWidth - padding.left - padding.right;
    const chartHeight = cssHeight - padding.top - padding.bottom;
    const maxValue = Math.max(...points.map((point) => point.value), 1);
    const barGap = 12;
    const barWidth = Math.max(16, (chartWidth - barGap * (points.length - 1)) / points.length);

    ctx.strokeStyle = "rgba(31, 42, 46, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    points.forEach((point, index) => {
      const x = padding.left + index * (barWidth + barGap);
      const barHeight = (point.value / maxValue) * (chartHeight - 8);
      const y = padding.top + chartHeight - barHeight;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = "#1f2a2e";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(point.value), x + barWidth / 2, y - 6);

      ctx.save();
      ctx.translate(x + barWidth / 2, padding.top + chartHeight + 16);
      ctx.rotate(-0.45);
      ctx.fillStyle = "#66757b";
      ctx.fillText(point.label, 0, 0);
      ctx.restore();
    });
  }

  drawBarChart("windChart", data.wind_distribution || [], "#b88718");
  drawBarChart("kiteChart", data.kite_distribution || [], "#0f6d7a");
})();

