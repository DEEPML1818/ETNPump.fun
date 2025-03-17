import React, { useRef, useEffect } from 'react';
import { createChart, AreaSeries, ColorType, PriceLineStyle } from 'lightweight-charts';

// Helper: Convert wei to ether if needed.
const fromWei = (wei) => Number(wei) / 1e18;

export default function LightweightChart({ priceHistoryData, convertPrice = false, colors = {} }) {
  const {
    backgroundColor = 'white',
    lineColor = '#2962FF',
    textColor = 'black',
    areaTopColor = '#2962FF',
    areaBottomColor = 'rgba(41, 98, 255, 0.28)',
  } = colors;

  const chartContainerRef = useRef();

  useEffect(() => {
    if (!chartContainerRef.current) return;
  
    console.info("Raw priceHistoryData:", priceHistoryData);
  
    // Ensure priceHistoryData is an array before processing
    if (!Array.isArray(priceHistoryData) || priceHistoryData.length === 0) {
      console.warn("Invalid or empty priceHistoryData:", priceHistoryData);
      return;
    }
  
    const formattedData = priceHistoryData
      .filter((entry) => Array.isArray(entry) && entry.length === 2) // Ensure valid tuples
      .map(([unixTime, price]) => ({
        time: new Date(Number(unixTime) * 1000).toISOString().split('T')[0],
        value: convertPrice ? fromWei(price) : Number(price),
      }))
      .filter((point, index, arr) => index === 0 || point.time !== arr[index - 1].time);
  
    console.info("Formatted Data for Chart:", formattedData);
  
    if (formattedData.length === 0) {
      console.warn("No valid formatted data for the chart.");
      return;
    }
  
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor: textColor,
      },
    });
    chart.timeScale().fitContent();
  
    const series = chart.addSeries(AreaSeries, {
      lineColor: lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lastValueVisible: false,
      priceLineVisible: false,
    });
  
    series.setData(formattedData);
  
    window.addEventListener("resize", () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
  
    return () => chart.remove();
  }, [priceHistoryData, convertPrice, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);
  
  return <div ref={chartContainerRef} style={{ width: '100%', height: '300px', position: 'relative' }} />;
}
