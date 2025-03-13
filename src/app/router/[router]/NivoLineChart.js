'use client';
import React from 'react';
import { ResponsiveLine } from '@nivo/line';

const NivoLineChart = ({ priceHistory, currentPrice, tokenSymbol }) => {
  // Use a dummy data point if no price history exists
  const dataPoints = priceHistory.length > 0 
    ? priceHistory 
    : [{ x: Date.now(), y: parseFloat(currentPrice) }];

  // Nivo expects an array of series; here we have one series
  const chartData = [
    {
      id: tokenSymbol || 'Token Price',
      data: dataPoints.map(pt => ({
        x: new Date(pt.x), // x-axis as Date objects
        y: pt.y,
      })),
    },
  ];

  return (
    <div style={{ height: 500 }}>
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{
          type: 'time',
          format: 'native',
          precision: 'minute',
        }}
        xFormat="time:%H:%M"
        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          format: '%H:%M',
          tickValues: 'every 10 minutes',
          legend: 'Time',
          legendOffset: 36,
          legendPosition: 'middle',
        }}
        axisLeft={{
          legend: 'Price',
          legendOffset: -40,
          legendPosition: 'middle',
        }}
        colors={{ scheme: 'nivo' }}
        pointSize={4}
        pointBorderWidth={1}
        useMesh={true}
        tooltip={({ point }) => (
          <div
            style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
            }}
          >
            <strong>{point.serieId}</strong>
            <br />
            {new Date(point.data.x).toLocaleTimeString()} : {point.data.y}
          </div>
        )}
      />
    </div>
  );
};

export default NivoLineChart;
