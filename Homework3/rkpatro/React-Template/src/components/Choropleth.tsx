import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import dataFromJson from '../../data/demo.json';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Box from "@mui/material/Box";
import { Bar, ComponentSize, Margin } from '../types';
import {dispatcher} from './eventBus.tsx';

interface popGrowthDataPoint {
    year: number;
    country: string;
    environmental_stress_score: number;
}
type GeoFeature = Feature<Geometry, { name: string }>;

export default function Choropleth() {
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const padding = 20;
  let years: number[] = [];
  const countryNameMap: Record<string, string> = {
  "USA": "United States",
  "England": "United Kingdom",
  "United Republic of Tanzania":"Tanzania",
  "Democratic Republic of the Congo":"Congo",
  "Russian Federation": "Russia",
  "Iran (Islamic Republic of)": "Iran",
  "Viet Nam": "Vietnam",
  "Republic of Korea": "South Korea",
  "Korea, Republic of": "South Korea"
};

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
    let data = new Map<number, Map<string, number>>()
    const colorScale = d3.scaleThreshold<number, string>()
    .domain([20, 35, 50, 65, 75, 100])
    .range(d3.schemeReds[7]);

    const legendItemWidth = legendWidth / colorScale.range().length;

    // Load external data and boot
    Promise.all([
      d3.json<FeatureCollection>("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
      d3.csv("../../data/archive/global_population_risk.csv", d => {
        const year = +d.year;
        if(!data.has(year)) {
          data.set(year, new Map());
        }
        data
          .get(year)!
          .set(d.country, +d.environmental_stress_score);
        return d;
      })
    ]).then(([geojson]) => {
      if (!geojson) {
        throw new Error("geoJSON failed to load");
      }

      years = Array.from(data.keys()).sort((a, b) => a - b);
      
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

      let yearIndex = 0;

      // Draw the map
      const paths = mapGroup
        .selectAll<SVGPathElement, GeoFeature>("path")
        .data(geojson.features as GeoFeature[])
        .join("path")
        .attr("d", path)
        .attr("stroke", "#050000ff")
        .on("mouseover", function (event: MouseEvent, d: GeoFeature) {
          const yearData = data.get(years[yearIndex]);
          const rawName = d.properties.name;
          const normalizedName = countryNameMap[rawName] ?? rawName;
          const value = yearData?.get(normalizedName);

          tooltip
            .style("opacity", 1)
            .html(`
              <strong>${normalizedName}</strong><br/>
              Environmental Stress Score: ${value ?? "No data"}
            `);

          d3.select(this).attr("stroke-width", 2);
        })
        .on("mousemove", function (event: MouseEvent) {
          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
          d3.select(this).attr("stroke-width", 1);
        })
        .on("click", function (event: MouseEvent, d: GeoFeature) {
          const rawName = d.properties.name;
          const normalizedName = countryNameMap[rawName] ?? rawName;

          dispatcher.call("countrySelected", undefined, normalizedName);
        })
        .style("box-shadow", "0px 2px 6px rgba(0,0,0,0.2)")
        .style("font-size", "13px")
        .style("font-family", "sans-serif");

      const yearLabel = svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top - 10)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("font-size", 20);

      const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "6px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

      function updateMap(year: number) {
        const yearData = data.get(year);
        yearLabel.text(year.toString());

        paths
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("fill", d => {
          const rawName = d.properties?.name;
          const normalizedName = countryNameMap[rawName] ?? rawName
          const value = yearData?.get(normalizedName);
          // if (value == null) {
          //   console.log("No data for:", rawName);
          // }
          return value != null ? colorScale(value) : "#eee";
        });
      }

      updateMap(years[yearIndex]);

      const interval = d3.interval(() => {
        yearIndex = (yearIndex + 1) % years.length;
        updateMap(years[yearIndex]);
      }, 1200);

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

      return () => {
        interval.stop();
      };
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