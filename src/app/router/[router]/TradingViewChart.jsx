'use client';

import { useEffect, useRef } from 'react';

const TradingViewChart = () => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamically load the TradingView library
    const tvScript = document.createElement('script');
    tvScript.src = '/charting_library/charting_library.js'; // Adjust path if necessary
    tvScript.async = true;
    tvScript.onload = () => {
      // Once loaded, load the datafeed script
      const datafeedScript = document.createElement('script');
      datafeedScript.src = '/datafeed.js';
      datafeedScript.async = true;
      datafeedScript.onload = initializeChart;
      document.head.appendChild(datafeedScript);
    };
    document.head.appendChild(tvScript);

    function initializeChart() {
      if (!window.TradingView || !window.Datafeed) {
        console.error('TradingView or Datafeed failed to load.');
        return;
      }
      const containerId = chartContainerRef.current.id || 'tv_chart_container';
      const widget = new window.TradingView.widget({
        symbol: 'ETN',          // Change to your default symbol if needed
        interval: '1',          // Set resolution (e.g., '1' for 1-minute)
        container_id: containerId,
        datafeed: window.Datafeed,
        library_path: '/charting_library/', // Must match your public folder structure
        locale: 'en',
        disabled_features: ['header_widget', 'timeframes_toolbar'],
        enabled_features: [],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        client_id: 'your_client_id', // Optional
        user_id: 'your_user_id'      // Optional
      });

      widget.onChartReady(() => {
        const activeChart = widget.activeChart();
        activeChart.removeAllSeries();
        activeChart.addLineSeries();
      });
    }

    return () => {
      if (tvScript && tvScript.parentNode) {
        tvScript.parentNode.removeChild(tvScript);
      }
    };
  }, []);

  return (
    <div
      id="tv_chart_container"
      ref={chartContainerRef}
      style={{ height: '600px', width: '100%' }}
    ></div>
  );
};

export default TradingViewChart;
