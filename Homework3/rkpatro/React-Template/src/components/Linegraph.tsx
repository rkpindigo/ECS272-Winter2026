import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import "d3-transition";
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import { ComponentSize, Margin } from '../types';
import Box from "@mui/material/Box";
import {dispatcher} from './eventBus.tsx';

interface LinePoint {
    year: number;
    country: string;
    population_growth_rate: number;
}

export default function LineGraph() {
  const barRef = useRef<HTMLDivElement>(null);
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const xAxisGroupRef = useRef<d3.Selection<SVGGElement, unknown, any, any> | null>(null);
  const yAxisGroupRef = useRef<d3.Selection<SVGGElement, unknown, any, any> | null>(null);
  const linePathRef = useRef<d3.Selection<SVGPathElement, unknown, any, any> | null>(null);
  const noDataTextRef = useRef<d3.Selection<SVGTextElement, unknown, any, any> | null>(null);

  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200);
  const [countryName, setCountryName] = useState<string>("united states");
  const [rawData, setRawData] = useState<LinePoint[]>([]);

  useResizeObserver({ ref: barRef as React.RefObject<HTMLDivElement>, onResize });

    useEffect(() => {
        d3.csv("../../data/archive/population_growth.csv", d => {
            return {
                year: +d.year,
                country: d.country,
                population_growth_rate: +d.population_growth_rate
            } as LinePoint;
        }).then((data) => {
            setRawData(data);
        });
    }, []);

    useEffect(() => {
        if (rawData.length === 0) return;

        initLineGraph();
    }, [rawData]);

    useEffect(() => {
        if (rawData.length === 0) return;
        updateLineGraph(countryName);
    }, [countryName]);

    useEffect(() => {
        dispatcher.on("countrySelected.lineChart", (country: string) => {
            setCountryName(country.toLowerCase());
        });

        return () => {
            dispatcher.on("countrySelected.lineChart", null);
        };
    }, []);

    function initLineGraph() {
        const margin = { top: 10, right: 30, bottom: 30, left: 60 };
        const width = 1380 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#line_chart");
        svg.selectAll("*").remove();

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        xScaleRef.current = d3.scaleLinear().range([0, width]);
        yScaleRef.current = d3.scaleLinear().range([height, 0]);

        xAxisGroupRef.current = chart.append("g")
            .attr("transform", `translate(0,${height})`);

        yAxisGroupRef.current = chart.append("g");

        linePathRef.current = chart.append("path")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2);
        
        noDataTextRef.current = chart.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("fill", "#666")
            .style("display", "none");  // hidden by default

        updateLineGraph(countryName);
    }

    function updateLineGraph(country: string) {
        if(!xScaleRef.current || !yScaleRef.current ||
            !xAxisGroupRef.current || !yAxisGroupRef.current||
            !linePathRef.current || !noDataTextRef.current) return;

        const xScale = xScaleRef.current;
        const yScale = yScaleRef.current;
        const xAxisGroup = xAxisGroupRef.current;
        const yAxisGroup = yAxisGroupRef.current;
        const linePath = linePathRef.current;
        const noDataText = noDataTextRef.current;

        const filtered = rawData.filter(d =>
            d.country.trim().toLowerCase() === country
        );

        if (filtered.length === 0) {
            // Hide line
            linePath.style("display", "none");

            // Hide axes
            xAxisGroup.style("opacity", 0);
            yAxisGroup.style("opacity", 0);

            // Show message
            noDataText
                .style("display", "block")
                .text(`No data available for ${country}, sorry :(`);

            return;
        }
        else {
            // Hide message
            noDataText
                .style("display", "none")

            // Show line
            linePath.style("display", "block");

            // Show axes
            xAxisGroup.style("opacity", 100);
            yAxisGroup.style("opacity", 100);
        }

        const width = 1380 - 60 - 30;
        const height = 400 - 10 - 30;

        xScale.domain(d3.extent(filtered, d => d.year) as [number, number]);
        yScale.domain(d3.extent(filtered, d => d.population_growth_rate) as [number, number]);

        const lineGenerator = d3.line<LinePoint>()
            .x(d => xScale(d.year))
            .y(d => yScale(d.population_growth_rate));

        //Transition axes
        xAxisGroup.transition()
            .duration(800)
            .call(d3.axisBottom(xScaleRef.current).tickFormat(d3.format("d")));

        yAxisGroup.transition()
            .duration(800)
            .call(d3.axisLeft(yScaleRef.current));

        //Transition line
        linePath
            .datum(filtered)
            .transition()
            .duration(800)
            .attr("d", lineGenerator);
    }

  return (
    <>
        <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
            Population Growth Rate in {countryName}
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
            id="line_chart"
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
