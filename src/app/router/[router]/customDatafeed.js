class CustomDatafeed {
    constructor(data) {
      this.data = data;
    }
  
    onReady(callback) {
      setTimeout(() => callback({
        supported_resolutions: ['1D', '1W', '1M'],
      }), 0);
    }
  
    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
      setTimeout(() => onSymbolResolvedCallback({
        name: symbolName,
        ticker: symbolName,
        session: '24x7',
        timezone: 'Etc/UTC',
        minmov: 1,
        pricescale: 100,
        has_intraday: false,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: ['1D', '1W', '1M'],
      }), 0);
    }
  
    getBars(symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) {
      const bars = this.data.map(bar => ({
        time: new Date(bar.date).getTime(),
        close: bar.price,
      }));
      onHistoryCallback(bars, { noData: false });
    }
  
    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
      // No real-time updates
    }
  
    unsubscribeBars(subscriberUID) {
      // No real-time updates
    }
  }
  
  export default CustomDatafeed;