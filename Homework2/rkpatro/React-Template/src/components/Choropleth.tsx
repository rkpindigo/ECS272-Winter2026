import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import dataFromJson from '../../data/demo.json';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Box from "@mui/material/Box";
import { Bar, ComponentSize, Margin } from '../types';

export default function Choropleth() {
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const padding = 20;

  useEffect(() => {
    d3.select('svg').selectAll('*').remove();
    initChoropleth();
  }, [])

  function initChoropleth() {
    // The svg
    const svg = d3.select("svg"),
    width = 960,
    height = 450;
    const legendWidth = 260;
    const legendHeight = 10;
    const legendMarginTop = 20;
    const legendMarginLeft = (width - legendWidth) / 2;

    // Data and color scale
    let data = new Map<string, number>()
    const colorScale = d3.scaleThreshold<number, string>()
    .domain([20, 35, 50, 65, 75, 100])
    .range(d3.schemeReds[7]);

    const legendItemWidth = legendWidth / colorScale.range().length;

    // Load external data and boot
    Promise.all([
      d3.json<FeatureCollection>("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
      d3.csv("../../data/archive/global_population_risk.csv", d => {
        if(d.year == "2025") {
          data.set(d.country, +d.environmental_stress_score);
        }
        return d;
      })
    ]).then(([geojson]) => {
      if (!geojson) {
        throw new Error("geoJSON failed to load");
      }
      
      // Map and projection
      const projection = d3.geoMercator()
        .fitSize(
          [width, height - margin.top - legendHeight],
          geojson
      );
      const path = d3.geoPath().projection(projection);

      const mapGroup = svg
        .append("g")
        .attr("transform", `translate(0, ${margin.top})`);

      // Draw the map
      mapGroup
        .selectAll("path")
        .data(geojson.features)
        .join("path")
        .attr("d", path)
        .attr("fill", (d: any) => {
          const countryName = d.properties?.name;
          return colorScale(data.get(countryName) || 0);
        })
        .attr("stroke", "#050000ff");

      const legend = svg.append("g")
        .attr(
          "transform",
          `translate(${legendMarginLeft}, ${height - legendHeight - 20})`
      );

      const thresholds = colorScale.domain();
      const colors = colorScale.range();

      legend.selectAll("rect")
        .data(colors)
        .join("rect")
        .attr("x", (_, i) => i * (legendWidth / colors.length))
        .attr("y", 20)
        .attr("width", legendWidth / colors.length)
        .attr("height", legendHeight)
        .attr("fill", d => d)
        .attr("stroke", "#ccc");
      
      legend
        .selectAll("text")
        .data(colors)
        .join("text")
        .attr("x", (_, i) => i * legendItemWidth + legendItemWidth / 2)
        .attr("y", 48)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .text((_, i) => {
          if( thresholds[i] === undefined ) {
            return `100`;
          }

          const start = i === 0 ? 0 : thresholds[i - 1];
          const end = thresholds[i] - 1;

          return `${start}–${end}`;
      });   
    });
  }

  return (
    <>
      <p>Global Environmental Stress Scores 2025</p>
      <Box sx={{ width: '100%', height: '450px' }}>
        <svg
          width='100%'
          height='100%'
          viewBox='0 0 960 500'
          preserveAspectRatio='xMidYMid meet'>
        </svg>
      </Box>
    </>
  )
}