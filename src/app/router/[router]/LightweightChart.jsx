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

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

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

    // Convert priceHistoryData (assumed as [timestamp, price] tuples) into the required format.
    const formattedData = priceHistoryData
      .map(([unixTime, price]) => ({
        time: new Date(Number(unixTime) * 1000).toISOString().split('T')[0],
        value: convertPrice ? fromWei(price) : Number(price),
      }))
      // Remove consecutive duplicate time values.
      .filter((point, index, arr) =>
        index === 0 || point.time !== arr[index - 1].time
      );

    console.info(formattedData);
    series.setData(formattedData);

    // Optional: Create price lines (if desired)
    if (formattedData.length > 0) {
      let minPrice = formattedData[0].value;
      let maxPrice = formattedData[0].value;
      formattedData.forEach((point) => {
        if (point.value < minPrice) minPrice = point.value;
        if (point.value > maxPrice) maxPrice = point.value;
      });
      const avgPrice = (minPrice + maxPrice) / 2;
      const lineWidth = 2;
      const minPriceLine = {
        price: minPrice,
        color: '#ef5350',
        lineWidth: lineWidth,
        lineStyle: PriceLineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Min Price',
      };
      const avgPriceLine = {
        price: avgPrice,
        color: 'black',
        lineWidth: lineWidth,
        lineStyle: PriceLineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Avg Price',
      };
      const maxPriceLine = {
        price: maxPrice,
        color: '#26a69a',
        lineWidth: lineWidth,
        lineStyle: PriceLineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Max Price',
      };

      series.createPriceLine(minPriceLine);
      series.createPriceLine(avgPriceLine);
      series.createPriceLine(maxPriceLine);

      chart.timeScale().fitContent();
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [priceHistoryData, convertPrice, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '300px', position: 'relative' }} />;
}
