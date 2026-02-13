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

interface DataPoint {
    year: number;
    country: string;
    cfc_consumption: number;
    industrialization_index: number;
    policy_score: number;
}


export default function Streamgraph() {
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  const margin: Margin = { top: 40, right: 20, bottom: 80, left: 60 };
  const padding = 20;
  const [countryName, setCountryName] = useState<string>("united states");
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, any, any> | null>(null);
  const layerGroupRef = useRef<d3.Selection<SVGGElement, unknown, any, any> | null>(null);
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const areaRef = useRef<d3.Area<d3.SeriesPoint<DataPoint>> | null>(null);
  const noDataTextRef = useRef<d3.Selection<SVGTextElement, unknown, any, any> | null>(null);
  const xAxisGroupRef = useRef<d3.Selection<SVGGElement, unknown, any, any> | null>(null);
  const yAxisGroupRef = useRef<d3.Selection<SVGGElement, unknown, any, any> | null>(null);



  dispatcher.on("countrySelected.streamGraph", (country: string) => {
    setCountryName(country.toLowerCase());
  });

//   useEffect(() => {
//     const svg = d3.select("#stream_graph")
//     initStreamgraph();

//     return () => {
//         svg.selectAll('*').remove();
//     };
//   }, [countryName, rawData]);

    useEffect(() => {
        d3.csv("../../data/archive/population_ozone_environment.csv", (d) => {
            const cleaned: any = {};
            for (const key in d) {
            cleaned[key.trim()] = d[key]?.trim();
            }

            return {
            year: +cleaned.year,
            country: cleaned.country,
            cfc_consumption: +cleaned.cfc_consumption,
            industrialization_index: +cleaned.industrialization_index,
            policy_score: +cleaned.policy_score
            } as DataPoint;
        }).then((data) => {
            setRawData(data);
        });
    }, []);

    useEffect(() => {
        if (rawData.length === 0) return;
        initStreamgraph();
        updateStreamgraph(countryName);
    }, [rawData]);

    useEffect(() => {
        if (rawData.length === 0) return;
        updateStreamgraph(countryName);
    }, [countryName]);


    function initStreamgraph() {
        const margin = { top: 20, right: 20, bottom: 30, left: 60 };
        const width = 460 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select<SVGSVGElement, unknown>("#stream_graph")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        svgRef.current = svg;

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        chart.append("text")
            .attr("class", "x-axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom)
            .style("font-size", "14px")
            .text("Year");

        chart.append("text")
            .attr("class", "y-axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -45)
            .style("font-size", "14px")
            .text("Aggregated Scores");

        layerGroupRef.current = chart.append("g")
            .attr("class", "layers");

        xScaleRef.current = d3.scaleLinear().range([0, width]);
        yScaleRef.current = d3.scaleLinear().range([height, 0]);

        areaRef.current = d3.area<d3.SeriesPoint<DataPoint>>()
            .curve(d3.curveBasis);

        noDataTextRef.current = chart.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .style("display", "none");
        

        xAxisGroupRef.current = chart.append("g")
            .attr("transform", `translate(0, ${height})`);

        yAxisGroupRef.current = chart.append("g");
    }

    function updateStreamgraph(country: string) {
        if (!layerGroupRef.current || 
            !xScaleRef.current || 
            !yScaleRef.current || 
            !areaRef.current || 
            !noDataTextRef.current) return;

        const layerGroup = layerGroupRef.current;
        const x = xScaleRef.current;
        const y = yScaleRef.current;
        const area = areaRef.current;
        const noDataText = noDataTextRef.current;

        const data = rawData.filter(d =>
            d.country.trim().toLowerCase() === country
        );

        if (data.length === 0) {
            layerGroup.selectAll("path")
            .transition()
            .duration(500)
            .style("opacity", 0);

            noDataText
            .style("display", "block")
            .text(`No data available for ${country}`);

            return;
        }

        noDataText.style("display", "none");

        data.sort((a, b) => a.year - b.year);

        const keys: (keyof DataPoint)[] = [
            "cfc_consumption",
            "industrialization_index",
            "policy_score"
        ];

        const stack = d3.stack<DataPoint>()
            .keys(keys)
            .offset(d3.stackOffsetNone);

        const series = stack(data);

        x.domain(d3.extent(data, d => d.year) as [number, number]);

        const yMin = d3.min(series, l => d3.min(l, d => d[0]))!;
        const yMax = d3.max(series, l => d3.max(l, d => d[1]))!;
        y.domain([yMin, yMax]);

        area
            .x(d => x(d.data.year))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]));

        const paths = layerGroup
            .selectAll<SVGPathElement, d3.Series<DataPoint, string>>("path")
            .data(series, d => d.key);

        paths.join(
            enter =>
                enter.append("path")
                    .style("fill", d => d3.schemeSet2[keys.indexOf(d.key as keyof DataPoint)])
                    .style("opacity", 0)
                    .attr("d", area)
                    .attr("opacity", 0)
                    .transition()
                    .duration(800)
                    .style("opacity", 1),

            update =>
                update.transition()
                    .duration(800)
                    .attr("d", area),

            exit =>
                exit.transition()
                    .duration(500)
                    .style("opacity", 0)
                    .remove()
        );

        xAxisGroupRef.current!
            .transition()
            .duration(800)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

        yAxisGroupRef.current!
            .transition()
            .duration(800)
            .call(d3.axisLeft(y));
    }


    return (
        <>
            <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
            Environmental Scores for {countryName} 1970-2025
            </p>
            <Box sx={{ 
            display: 'flex', 
            flexDirection: 'row',
            width: '100%', 
            height: '400px',
            overflow: 'hidden' 
            }}>
            {/* 1. Legend Container */}
            <div 
                id="legend_container" 
                style={{ 
                minWidth: '150px', 
                padding: '10px',
                fontSize: '0.8rem' 
                }}
            ></div>

            {/* 2. Graph Container */}
            <div style={{ flexGrow: 1, position: 'relative' }}>
                <svg
                id="stream_graph"
                width='100%'
                height='100%'
                viewBox='0 0 460 400' //need to match width and height in init function
                preserveAspectRatio='xMidYMid meet'>
                </svg>
            </div>
            </Box>
        </>
    );
}