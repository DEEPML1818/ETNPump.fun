'use client';

import { useEffect, useRef } from 'react';

const TradingViewChart = () => {
  const chartContainerRef = useRef(null);
  const containerId = 'tv_chart_container'; // Fixed container ID

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamically load the TradingView library script
    const tvScript = document.createElement('script');
    tvScript.src = '/charting_library/charting_library.js'; // Ensure this path is correct
    tvScript.async = true;
    tvScript.onload = () => {
      // Load the datafeed script after TradingView library loads
      const datafeedScript = document.createElement('script');
      datafeedScript.src = '/datafeed.js';
      datafeedScript.async = true;
      datafeedScript.onload = () => {
        // Use setTimeout to delay initialization slightly
        setTimeout(() => {
          initializeChart();
        }, 100);
      };
      document.head.appendChild(datafeedScript);
    };
    document.head.appendChild(tvScript);

    function initializeChart() {
      if (!chartContainerRef.current) {
        console.error("Chart container not found.");
        return;
      }
      if (!window.TradingView || !window.Datafeed) {
        console.error("TradingView or Datafeed failed to load.");
        return;
      }
      // Directly use the fixed containerId in the widget configuration
      const widget = new window.TradingView.widget({
        symbol: 'ETN',          // Set your default symbol if needed
        interval: '1',          // e.g., 1-minute interval
        container_id: containerId,
        datafeed: window.Datafeed,
        library_path: '/charting_library/', // Ensure this matches your public folder structure
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

    // Cleanup on component unmount
    return () => {
      if (tvScript && tvScript.parentNode) {
        tvScript.parentNode.removeChild(tvScript);
      }
    };
  }, []);

  return (
    <div
      id={containerId}  // Ensure the div has the fixed id
      ref={chartContainerRef}
      style={{ height: '600px', width: '100%' }}
    ></div>
  );
};

export default TradingViewChart;
