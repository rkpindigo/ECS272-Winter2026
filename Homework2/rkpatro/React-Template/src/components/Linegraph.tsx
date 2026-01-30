import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../types';
import Box from "@mui/material/Box";

interface LinePoint {
    year: number;
    country: string;
    population_growth_rate: number;
}

export default function LineGraph() {
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)

  useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });

    useEffect(() => {
        initLineGraph();

        return () => {
            d3.select('svg').selectAll('*').remove();
        };
    }, []);

  function initLineGraph() {
    var margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = 1380 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    var svg = d3.select("#line-chart")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    d3.csv("../../data/archive/population_growth.csv", d => {
        return {
            year: +d.year,
            country: d.country,
            population_growth_rate: +d.population_growth_rate
        } as LinePoint;
    }).then((rawData) => {

    const data = rawData.filter((d: any) => {
        //remove whitespace and make lowercase
        const countryValue = String(d.country).trim().toLowerCase();
        
        return countryValue === "united states" || 
            countryValue === "usa" || 
            countryValue.includes("united states");
    });

    //add x axis
    var x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year) as [number, number])
    .range([ 0, width ]);
    svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    //add y axis
    var y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.population_growth_rate) as [number, number])
    .range([ height, 0 ]);
    svg.append("g")
    .call(d3.axisLeft(y));

    //define the generator outside the attr call for better type safety
    const lineGenerator = d3.line<LinePoint>()
        .x(d => x(d.year))
        .y(d => y(d.population_growth_rate));

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom) //adjust margin.bottom if it's too close
        .style("font-size", "14px")
        .text("Year");
    
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20) //moves it left of the axis
        .attr("x", -height / 2)
        .style("font-size", "14px")
        .text("Population Growth Rate (%)");

    svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", lineGenerator)
    })
  }

  return (
    <>
        <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
            Population Growth Rate in the United States
        </p>
        <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row', //side-by-side
        width: '100%', 
        height: '425px',
        overflow: 'hidden' 
        }}>
        <div style={{ flexGrow: 1, position: 'relative' }}>
            <svg
            id="line-chart"
            width='100%'
            height='100%'
            viewBox='0 0 1380 425'
            preserveAspectRatio='xMidYMid meet'>
            </svg>
        </div>
        </Box>
    </>
  )
}
