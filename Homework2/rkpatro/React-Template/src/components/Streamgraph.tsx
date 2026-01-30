import React from 'react'
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import dataFromJson from '../../data/demo.json';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Box from "@mui/material/Box";
import { Bar, ComponentSize, Margin } from '../types';

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

  useEffect(() => {
    initStreamgraph();

    return () => {
        d3.select('svg').selectAll('*').remove();
    };
  }, []);

  function initStreamgraph() {
    var margin = {top: 20, right: 20, bottom: 30, left: 60},
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#my_dataviz")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    svg.selectAll("*").remove();

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

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

    }).then((rawData) => {
        const data = rawData.filter((d: any) => {
            //remove whitespace and make lowercase
            const countryValue = String(d.country).trim().toLowerCase();
            
            return countryValue === "united states" || 
                countryValue === "usa" || 
                countryValue.includes("united states");
        });

        const normalized = rawData.map((row: any) => {
            const newRow: any = {};
            Object.keys(row).forEach(k => {
                newRow[k.trim()] = row[k];
            });
            return newRow;
        });

        //list of key columns of csv file
        const keys: (keyof DataPoint)[] = [
            "cfc_consumption",
            "industrialization_index",
            "policy_score"
        ];

        //x-axis
        var x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year) as [number, number])
            .range([ 0, width ]);
        chart.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));


        const color = d3.scaleOrdinal<string, string>()
            .domain(keys as string[])
            .range(["#1b9e77", "#d95f02", "#7570b3"]);

        //stack plots on top of each other to accumulate values
        data.sort((a, b) => a.year - b.year);
        const stack = d3.stack<DataPoint>()
            .keys(keys)
            .offset(d3.stackOffsetWiggle);
        const series = stack(data);
        
        //y-axis
        const yMin = d3.min(series, layer => d3.min(layer, d => d[0]));
        const yMax = d3.max(series, layer => d3.max(layer, d => d[1]));
        var y = d3.scaleLinear()
            .domain([yMin!, yMax!])
            .range([ height, 0 ]);
        
        
        const area = d3.area<d3.SeriesPoint<DataPoint>>()
            .x(d => x(d.data.year))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveBasis);
        
        //so that layers don't mix with axes
        const layerGroup = chart.append("g").attr("class", "layers");

        const legendDiv = d3.select("#legend_container");
        legendDiv.selectAll("*").remove();

        //create item on legend for each key column
        keys.forEach((key, i) => {
            const row = legendDiv.append("div")
                .attr("class", "legend-row")

            //corresponsing color box
            row.append("div")
                .attr("class", "legend-color")
                .style("background-color", color(key as string)); // Colors stay dynamic

            //corresponsing text label
            row.append("span")
                .text(key.replace(/_/g, " "));
        });

        layerGroup
            .selectAll(".myArea") 
            .data(series)
            .join("path")
            .attr("class", "myArea") // Assign the class here
            .style("fill", d => color(d.key as string))
            .attr("d", area); // Use the simplified generator we discussed

        // 5. Update the Y-Axis (it will now show negative to positive numbers)
        chart.append("g")
            .call(d3.axisLeft(y));
        
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom) // Adjust margin.bottom if it's too close
            .style("font-size", "14px")
            .text("Year");
        
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20) // Moves it left of the axis
            .attr("x", -height / 2)
            .style("font-size", "14px")
            .text("Aggregated Scores");

        return d3;
    })
}

    return (
        <>
            <p style={{ fontWeight: 'bold', textAlign: 'center' }}>
            Environmental Scores for United States 1970-2025
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
                id="my_dataviz"
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