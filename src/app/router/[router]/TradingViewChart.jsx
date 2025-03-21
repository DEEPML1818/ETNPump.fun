import React, { useEffect, useRef } from 'react';
import CustomDatafeed from './customDatafeed';

const TradingViewChart = ({ symbol, data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      try {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol || 'NASDAQ:AAPL',
          interval: '1', // Use 1-minute interval
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '3', // Style 3 corresponds to the area chart
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          container_id: containerRef.current.id,
          datafeed: new CustomDatafeed(data),
        });
        console.log('TradingView widget loaded successfully');
      } catch (error) {
        console.error('Error loading TradingView widget:', error);
      }
    };

    script.onerror = (error) => {
      console.error('Error loading TradingView script:', error);
    };

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, data]);

  return <div id="tradingview_chart" ref={containerRef} style={{ height: '500px', width: '100%' }} />;
};

export default TradingViewChart;