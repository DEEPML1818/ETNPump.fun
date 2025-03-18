window.Datafeed = {
    onReady: (callback) => {
      setTimeout(() => {
        callback({
          supported_resolutions: ['1', '5', '15', '30', '60', 'D'],
        });
      }, 0);
    },
  
    resolveSymbol: (symbolName, onSymbolResolvedCallback, onErrorCallback) => {
      const symbolInfo = {
        name: symbolName,
        ticker: symbolName,
        session: '24x7',
        timezone: 'Etc/UTC',
        minmov: 1,
        pricescale: 100, // Adjust this based on your data's precision
        has_intraday: true,
        supported_resolutions: ['1', '5', '15', '30', '60', 'D'],
        volume_precision: 0,
      };
      setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    },
  
    getBars: (symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, isFirstCall) => {
      // Use the global priceHistoryData set by your Next.js page
      const allBars = window.priceHistoryData || [];
      // Note: 'from' and 'to' are in seconds; convert them to milliseconds
      const bars = allBars.filter(bar => bar.time >= from * 1000 && bar.time <= to * 1000);
      onHistoryCallback(bars, { noData: bars.length === 0 });
    },
  
    subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
      // For real-time updates, implement a subscription (e.g., via WebSocket or polling).
      // Call onRealtimeCallback(newBar) when new data arrives.
    },
  
    unsubscribeBars: (subscriberUID) => {
      // Clean up any real-time subscriptions if needed.
    },
  };
  