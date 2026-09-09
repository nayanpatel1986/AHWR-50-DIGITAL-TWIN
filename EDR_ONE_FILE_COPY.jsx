/*
 * EDR_ONE_FILE_COPY.jsx
 * Copy this one file into another React/Vite project, then import it as your EDR page.
 * Required npm packages: @mui/material @emotion/react @emotion/styled lucide-react axios socket.io-client xlsx
 * Backend expected endpoints/events: GET /api/history, GET /api/rig/latest, Socket.IO event rig_data.
 * For Modbus projects, keep this UI unchanged and map your Modbus tags in backend to measurement.field names.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    ListItemText,
    ListSubheader,
    MenuItem,
    Paper,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip as MuiTooltip,
    Typography,
    useTheme
} from '@mui/material';
import {
    Activity,
    ChevronsDown,
    ChevronsUp,
    Clock,
    Download,
    FileSpreadsheet,
    FileText,
    Gauge,
    Image as ImageIcon,
    Plus,
    Radio,
    Ruler,
    Settings,
    SlidersHorizontal,
    Trash2,
    X
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const edrCatalog = {
  "categories": [
    {
      "id": "drilling",
      "label": "Drilling",
      "fields": [
        {
          "id": "bit_depth",
          "label": "Bit Depth",
          "unit": "m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 3000,
          "plcTag": "Bit Depth-m"
        },
        {
          "id": "delta_torque",
          "label": "Delta Torque",
          "unit": "daN.m",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5000,
          "plcTag": "Delta Torque-daN*m"
        },
        {
          "id": "hole_depth",
          "label": "Hole Depth",
          "unit": "m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 3000,
          "plcTag": "TOTAL BIT Depth-m"
        },
        {
          "id": "hook_load",
          "label": "Hook Load",
          "unit": "ton",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "drilling.hook_load"
        },
        {
          "id": "operation_mode",
          "label": "Operation",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 4,
          "plcTag": "Operation-1=DRILLING, 2=TRIP IN, 3=TRIP OUT, 4=CASING"
        },
        {
          "id": "rop",
          "label": "ROP",
          "unit": "m/h",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 80,
          "plcTag": "ROP-m/h"
        },
        {
          "id": "rpm",
          "label": "Rotary RPM",
          "unit": "rpm",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 250,
          "plcTag": "Drill String Speed-RPM"
        },
        {
          "id": "torque",
          "label": "Rotary Torque",
          "unit": "daN.m",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 20000,
          "plcTag": "Drill String Torque-daN*m"
        },
        {
          "id": "wob",
          "label": "Weight on Bit",
          "unit": "ton",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "WOB -Ton"
        }
      ]
    },
    {
      "id": "drawworks",
      "label": "Drawworks",
      "fields": [
        {
          "id": "block_position",
          "label": "Block Position",
          "unit": "m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 50,
          "plcTag": "ACS Actual Block Position"
        },
        {
          "id": "hook_load",
          "label": "Hook Load",
          "unit": "ton",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Weight on Hook -Ton"
        },
        {
          "id": "rope_wear",
          "label": "Ropes Wear/Km",
          "unit": "m/h",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "Ropes Wear-ton/km"
        }
      ]
    },
    {
      "id": "mudpump",
      "label": "Mud Pump",
      "fields": [
        {
          "id": "delta_pressure",
          "label": "Delta SPP",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Delta SPP-Bar"
        },
        {
          "id": "flow_in",
          "label": "Flow In",
          "unit": "L/min",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1200,
          "plcTag": "Mud Pump Inlet Flow-Lt/min"
        },
        {
          "id": "flow_out_percentage",
          "label": "Flow Out",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "mudpump.flow_out_percentage"
        },
        {
          "id": "flow_out",
          "label": "Mud Return Flow -%",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "Mud Return Flow -%"
        },
        {
          "id": "pressure",
          "label": "Pump Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "SPP-Bar"
        },
        {
          "id": "spm",
          "label": "SPM",
          "unit": "spm",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 200,
          "plcTag": "Mud Pumps Total SPM-SPM"
        },
        {
          "id": "total_spm",
          "label": "Total SPM",
          "unit": "spm",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 400,
          "plcTag": "Mud Pumps Totals Strokes-Count"
        }
      ]
    },
    {
      "id": "fluid",
      "label": "Fluid",
      "fields": [
        {
          "id": "trip_tank_percentage",
          "label": "Active TripTank Volume Gain/Loss -%",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Active TripTank Volume Gain/Loss -%"
        },
        {
          "id": "tank_1",
          "label": "Mud Tank 1 Volume",
          "unit": "m3",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Mud Tank 1 Volume -m^3"
        },
        {
          "id": "tank_2",
          "label": "Mud Tank 2 Volume",
          "unit": "m3",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Mud Tank 2 Volume -m^3"
        },
        {
          "id": "tank_3",
          "label": "Mud Tank 3 Volume",
          "unit": "m3",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Mud Tank 3 Volume -m^3"
        },
        {
          "id": "tank_4",
          "label": "Mud Tank 4 Volume",
          "unit": "m3",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Mud Tank 4 Volume -m^3"
        },
        {
          "id": "tank_gain_loss",
          "label": "Tank Gain/Loss",
          "unit": "m3",
          "precision": 1,
          "defaultMin": -50,
          "defaultMax": 50,
          "plcTag": "Active Tank Volume Gain/Loss -m^3"
        },
        {
          "id": "total_tank_volume",
          "label": "Tank Volume",
          "unit": "m3",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "Total Active Tank Volume-m^3"
        },
        {
          "id": "trip_tank",
          "label": "Trip Tank",
          "unit": "m3",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 50,
          "plcTag": "Trip Tank Active Mud Volume -m^3"
        }
      ]
    },
    {
      "id": "wellhead",
      "label": "Wellhead / Pressures",
      "fields": [
        {
          "id": "casing_pressure",
          "label": "Casing Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 350,
          "plcTag": "Casing Pressure-Bar"
        },
        {
          "id": "tubing_pressure",
          "label": "Tubing Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 350,
          "plcTag": "Tubing Pressure-Bar"
        },
        {
          "id": "wellhead_pressure",
          "label": "Wellhead Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 350,
          "plcTag": "Wellhead Pressure-Bar"
        }
      ]
    },
    {
      "id": "safety",
      "label": "Safety",
      "fields": [
        {
          "id": "esd_active",
          "label": "Emergency Stop",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "Emergency Stop-0=NORMAL, 1=ESD ACTIVE"
        },
        {
          "id": "lockout_active",
          "label": "Equipment Lockout",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "Equipment Lockout-0=NORMAL, 1=LOCKED OUT"
        }
      ]
    },
    {
      "id": "cat_engine",
      "label": "CAT Engine",
      "fields": [
        {
          "id": "battery_voltage",
          "label": "Battery Voltage",
          "unit": "V",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 32,
          "plcTag": "CAT Engine ElectricalPotential"
        },
        {
          "id": "pedal_position",
          "label": "CAT Engine ACCELERATION PEDAL POSITION",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 50,
          "plcTag": "CAT Engine ACCELERATION PEDAL POSITION"
        },
        {
          "id": "coolant_level",
          "label": "CAT Engine CoolantLevelPercentage",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "CAT Engine CoolantLevelPercentage"
        },
        {
          "id": "fuel_temp",
          "label": "CAT Engine FuelTemperature",
          "unit": "C",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 120,
          "plcTag": "CAT Engine FuelTemperature"
        },
        {
          "id": "total_fuel",
          "label": "CAT Engine TotalFuelUsed",
          "unit": "L",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "CAT Engine TotalFuelUsed"
        },
        {
          "id": "total_hours",
          "label": "CAT Engine TotalHoursOperation",
          "unit": "h",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 10000,
          "plcTag": "CAT Engine TotalHoursOperation"
        },
        {
          "id": "run_hours",
          "label": "CAT RunHours",
          "unit": "h",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 10000,
          "plcTag": "CAT RunHours"
        },
        {
          "id": "source_cmd",
          "label": "CAT Sourcecmd",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 6,
          "plcTag": "CAT Sourcecmd-0=NONE, 1=LOCAL, 2=REMOTE, 3=MANUAL, 4=AUTO, 5=DCC, 6=---"
        },
        {
          "id": "status",
          "label": "CAT Status",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 7,
          "plcTag": "CAT status- -1=UNKNOWN, 0=READY, 1=IN PROGRESS, 2=STATUS DONE, 3=EMERGENCY NOT OK, 4=NOT READY, 5=FAULT, 6 = RUNNING + FAULT, 7=STOP FORCED "
        },
        {
          "id": "coolant_temp",
          "label": "Coolant Temp",
          "unit": "C",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 120,
          "plcTag": "CAT Engine CoolantTemperature"
        },
        {
          "id": "load",
          "label": "Engine Load",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "CAT Engine TorquePercentage"
        },
        {
          "id": "rpm",
          "label": "Engine RPM",
          "unit": "rpm",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2000,
          "plcTag": "CAT Engine speed RPM"
        },
        {
          "id": "fuel_pressure",
          "label": "Fuel Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 20,
          "plcTag": "CAT Engine FuelDeliveryPressure"
        },
        {
          "id": "fuel_rate",
          "label": "Fuel Rate",
          "unit": "L/h",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 120,
          "plcTag": "CAT Engine FuelRate"
        },
        {
          "id": "oil_pressure",
          "label": "Oil Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 10,
          "plcTag": "CAT Engine OilPressure"
        }
      ]
    },
    {
      "id": "acs",
      "label": "ACS",
      "fields": [
        {
          "id": "calibration_status",
          "label": "ACS Calibration Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 11,
          "plcTag": "ACS Calibration status--1=UNKNOWN, 1=SEQ IN PROGRESS, 2=NOT CALIBRATED, 3=CALIBRATED,10=MOVE UP TO CROWN, 10=MOVE UP TO CROWN, 11=MOVE DOWN TO TAG LOW "
        },
        {
          "id": "status",
          "label": "ACS Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 3,
          "plcTag": "ACS status-0=UNKNONE, 1=ON, 2=OFF, 3=DISABLE "
        },
        {
          "id": "block_position",
          "label": "Block Position",
          "unit": "m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 50,
          "plcTag": "acs.block_position"
        },
        {
          "id": "bottomsaver",
          "label": "Bottomsaver",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "ACS Bottomsaver in mm"
        },
        {
          "id": "crownsaver",
          "label": "Crownsaver",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "ACS Crownsaver in mm"
        },
        {
          "id": "floorsaver",
          "label": "Floorsaver",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "ACS floorsaver in mm"
        },
        {
          "id": "lower_tag",
          "label": "Lower Tag",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "ACS Lowertag position in mm"
        },
        {
          "id": "upper_tag",
          "label": "Upper Tag",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "ACS UPPERTAG POSITION mm"
        }
      ]
    },
    {
      "id": "hpu",
      "label": "HPU",
      "fields": [
        {
          "id": "aux_pressure",
          "label": "Aux Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 300,
          "plcTag": "HPU Auxilary line pressure in bar"
        },
        {
          "id": "discharge_pressure",
          "label": "Discharge Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 300,
          "plcTag": "HPU Discharge line pressure in bar"
        },
        {
          "id": "gate_valve",
          "label": "HPU Gate Valve",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 1,
          "plcTag": "HPU Gate valve-1=OPEN, 0=CLOSE"
        },
        {
          "id": "htd_pump1_flow",
          "label": "HTD PUMP-2 Flow Rate",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "HPU HydrPumpHTD pump1 actual flow %"
        },
        {
          "id": "htd_pump1_press",
          "label": "HTD PUMP-2 Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "HPU HydrPumpHTD pump1 Actual Press bar"
        },
        {
          "id": "htd_pump1_status",
          "label": "HTD PUMP-2 Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HPU HydrPumpHTD pump1 status-0=NOT READY, 1=READY, 2=ENABLE"
        },
        {
          "id": "htd_pump2_flow",
          "label": "HTD PUMP-4 Flow Rate",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "HPU HydrPumpHTD pump2 actual flow %"
        },
        {
          "id": "htd_pump2_press",
          "label": "HTD PUMP-4 Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "HPU HydrPumpHTD pump2 Actual Press bar"
        },
        {
          "id": "htd_pump2_status",
          "label": "HTD PUMP-4 Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HPU HydrPumpHTD pump2 status-0=NOT READY, 1=READY, 2=ENABLE"
        },
        {
          "id": "pdw_pump_flow",
          "label": "PUMP-3 PDW Flow Rate",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "HPU HydrPumpPDW actual flow %"
        },
        {
          "id": "pdw_pump_press",
          "label": "PUMP-3 PDW Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "HPU HydrPumpPDW Actual Press bar"
        },
        {
          "id": "pdw_pump_status",
          "label": "PUMP-3 PDW Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HPU HydrPumpPDW status-0=NOT READY, 1=READY, 2=ENABLE"
        },
        {
          "id": "oil_filter_1",
          "label": "HPU Oil Filter:1",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:1-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_filter_2",
          "label": "HPU Oil Filter:2",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:2-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_filter_3",
          "label": "HPU Oil Filter:3",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:3-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_filter_4",
          "label": "HPU Oil Filter:4",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:4-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_filter_5",
          "label": "HPU Oil Filter:5",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:5-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_filter_6",
          "label": "HPU Oil Filter:6",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:6-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_filter_7",
          "label": "HPU Oil Filter:7",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:7-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_filter_8",
          "label": "HPU Oil Filter:8",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "HPU Oil filter:8-1=OK, 0=CLOGGED"
        },
        {
          "id": "oil_level_status",
          "label": "HPU Oil Level",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 4,
          "plcTag": "HPU Oil level-0=Level OK, 1=Level Low, 2=Level Low-Low, 3=Level High, 4= Level High-High"
        },
        {
          "id": "oil_temp_status",
          "label": "HPU Oil Temp",
          "unit": "C",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 3,
          "plcTag": "HPU Oil temp-0=Temp. OK, 1=Temp. Low, 2=Temp. High, 3=Temp. High-High"
        },
        {
          "id": "op_mode",
          "label": "HPU Oprmode-0 = Unknown, 1 = Drilling 2 = RigUp",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HPU Oprmode-0 = Unknown, 1 = Drilling 2 = RigUp"
        },
        {
          "id": "pilot_pressure",
          "label": "HPU Pilot ActLSPress",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "HPU Pilot ActLSPress bar"
        },
        {
          "id": "pilot_status",
          "label": "HPU Pilot Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HPU Pilot status-0=OFF, 1=ON, 2=FAULT"
        },
        {
          "id": "run_hours",
          "label": "HPU RUN HOURS",
          "unit": "h",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 10000,
          "plcTag": "HPU RUN HOURS"
        },
        {
          "id": "status",
          "label": "HPU Status-0 = OFF, 1 = ON In IDLE, 2 = ON",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HPU status-0 = OFF, 1 = ON in IDLE, 2 = ON "
        },
        {
          "id": "oil_level",
          "label": "Oil Level",
          "unit": "%",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 100,
          "plcTag": "HPU ActOil level in %"
        },
        {
          "id": "oil_temp",
          "label": "Oil Temp",
          "unit": "C",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 120,
          "plcTag": "HPU ActTemp in c"
        }
      ]
    },
    {
      "id": "htd",
      "label": "HTD",
      "fields": [
        {
          "id": "brake_status",
          "label": "HTD Brake Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5,
          "plcTag": "HTD Brake Status-0=Unknown, 1 = Closing, 2 = Closed, 3 = Opening, 4 = Open, 5 = Fault"
        },
        {
          "id": "rpm_command",
          "label": "HTD COMMAND",
          "unit": "rpm",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 250,
          "plcTag": "HTD rpm COMMAND"
        },
        {
          "id": "elevator_status",
          "label": "HTD Elevator Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5,
          "plcTag": "HTD Elevator Status-0= Uncknown, 1 = Opening, 2 = Closing, 3 = Open, 4 = Close, 5 = Fault"
        },
        {
          "id": "gear_status",
          "label": "HTD GEAR Status",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 8,
          "plcTag": "HTD GEAR status--2=UNKNOWN, -1=FAULT, 1=GEAR 1, 2=GEAR 2, 3=GEAR 3, 4=GEAR 4. 5= GEAR 1 REGENERATIVE, 6= GEAR 2 REGENERATIVE, 7=GEAR 3 REGENERATIVE, 8= GEAR 4 REGENERATIVE"
        },
        {
          "id": "ibop_status",
          "label": "HTD IBOP Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5,
          "plcTag": "HTD IBOP Status-0= Uncknown, 1 = Opening, 2 = Closing, 3 = Open, 4 = Close, 5 = Fault"
        },
        {
          "id": "inclination_status",
          "label": "HTD Inclination Status",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 8,
          "plcTag": "HTD Inclination status-1= Inclination IN in progress, 2=Inclination IN, 3=Inclination OUT in progress, 4=Inclinated OUT, 5=Half Way, 6=Stand Still, 7=Tilted In, 8=Tilted Out"
        },
        {
          "id": "link_rotation_status",
          "label": "HTD Link Rotation Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 7,
          "plcTag": "HTD Link rotation Status-0= Uncknown, 1 = Unlocking, 2 = Unlocked, 3 = Rot. Fwd, 4 = Rot. Bwd, 5 = Locking, 6 = Locked ,  7 = Fault"
        },
        {
          "id": "tilt_status",
          "label": "HTD Link Tilt Status-0 = None, 1 = Float ON, 2 = Vertical, 3 = Float OFF, 4 = Extend, 5 = Retract, 6 = Fault",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 6,
          "plcTag": "HTD Link Tilt status-0 = None, 1 = Float ON, 2 = Vertical, 3 = Float OFF, 4 = Extend, 5 = Retract, 6 = Fault"
        },
        {
          "id": "lube_status",
          "label": "HTD Lube Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 3,
          "plcTag": "HTD Lube Status-0=OFF, 1=CMD RUN, 2=RUNNING, 3 = FAULT"
        },
        {
          "id": "op_mode",
          "label": "HTD Opmode-0 = Unknown, 1 = Dolly 2 = Link",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HTD opmode-0 = Unknown, 1 = Dolly 2 = Link"
        },
        {
          "id": "rpm_request",
          "label": "HTD Request",
          "unit": "rpm",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 250,
          "plcTag": "HTD rpm Request"
        },
        {
          "id": "rotation_status",
          "label": "HTD Rotation Status-0 = Stand Still, 1 = Rotation FWD, 2 = Rotation BWD, 3 = Neutral",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 3,
          "plcTag": "HTD Rotation Status-0 = Stand still, 1 = Rotation FWD, 2 = Rotation BWD, 3 = Neutral"
        },
        {
          "id": "rpm",
          "label": "HTD RPM",
          "unit": "rpm",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 250,
          "plcTag": "HTD rpm"
        },
        {
          "id": "status",
          "label": "HTD Status-0 = OFF, 1 = ON In IDLE, 2 = ON",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HTD status-0 = OFF, 1 = ON in IDLE, 2 = ON "
        },
        {
          "id": "suspension_status",
          "label": "HTD Suspensions Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "HTD suspensions Status-0=none, 1= in push, 2= in pull"
        },
        {
          "id": "tilt_status_db65",
          "label": "HTD Tilt Status",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 6,
          "plcTag": "HTD Tilt status-1= Tilting IN, 2=Tilt IN, 3=Tilting OUT, 4=Tilt OUT, 5=Half Way, 6=Stand Still"
        },
        {
          "id": "torque",
          "label": "HTD Torque",
          "unit": "daN.m",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2000,
          "plcTag": "HTD TORQUE DaNm"
        },
        {
          "id": "torque_command",
          "label": "HTD Torque COMMAND",
          "unit": "daN.m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 20000,
          "plcTag": "HTD torque COMMAND"
        },
        {
          "id": "torque_request",
          "label": "HTD Torque Request",
          "unit": "daN.m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 20000,
          "plcTag": "HTD torque Request"
        },
        {
          "id": "working_hours",
          "label": "HTD WORKING HOURS",
          "unit": "h",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 10000,
          "plcTag": "HTD WORKING HOURS"
        },
        {
          "id": "working_minutes",
          "label": "HTD WORKING MINUTES",
          "unit": "min",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 10000,
          "plcTag": "HTD WORKING MINUTES"
        },
        {
          "id": "work_mode",
          "label": "HTD Workmode-0 = Unknown, 1 = Drill, 2 = Spin, 3 = Torque",
          "unit": "daN.m",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 3,
          "plcTag": "HTD workmode-0 = Unknown, 1 = Drill, 2 = Spin, 3 = Torque"
        },
        {
          "id": "inclination",
          "label": "Inclination",
          "unit": "deg",
          "precision": 1,
          "defaultMin": -90,
          "defaultMax": 90,
          "plcTag": "HTD Inclination angle in %"
        },
        {
          "id": "vertical_speed",
          "label": "Vertical Speed",
          "unit": "m/s",
          "precision": 2,
          "defaultMin": -5,
          "defaultMax": 5,
          "plcTag": "HTD vertical speed"
        }
      ]
    },
    {
      "id": "cwk",
      "label": "CWK",
      "fields": [
        {
          "id": "clamp_force",
          "label": "Clamp Force",
          "unit": "kN",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "CWK Clamp Actcloseforce"
        },
        {
          "id": "clamp_pressure",
          "label": "Clamp Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 300,
          "plcTag": "CWK Clamp close pressure"
        },
        {
          "id": "carrier_status",
          "label": "CWK Carrier",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 6,
          "plcTag": "CWK Carrier-1= STOP, 2=PARKING POSITION, 3= WORK POSITION, 4= LIFTING, 5=LOWERING, 6=FAULT"
        },
        {
          "id": "clamp_status",
          "label": "CWK Clamp",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5,
          "plcTag": "CWK Clamp-0=NONE, 1=OPENING, 2=CLOSING, 3=IS OPEN, 4=IS CLOSE, 5=FAULT"
        },
        {
          "id": "clamp_force_ok",
          "label": "CWK Clamp Actcloeforce Ok",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "CWK Clamp Actcloeforce ok"
        },
        {
          "id": "clamp_pressure_ok",
          "label": "CWK Clamp Close Pressure OK",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "CWK Clamp close pressure OK"
        },
        {
          "id": "indexer_dx",
          "label": "CWK Indexer DX",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 3,
          "plcTag": "CWK Indexer DX-1=UP, 2=DOWN, 3=FAULT"
        },
        {
          "id": "indexer_sx",
          "label": "CWK Indexer SX",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 3,
          "plcTag": "CWK Indexer SX-1=UP, 2=DOWN, 3=FAULT"
        },
        {
          "id": "kickers_dx",
          "label": "CWK Kickers DX",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 3,
          "plcTag": "CWK Kickers DX-1=EXTEND, 2=RETRACT, 3=FAULT"
        },
        {
          "id": "kickers_sx",
          "label": "CWK Kickers SX",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 3,
          "plcTag": "CWK Kickers SX-1=EXTEND, 2=RETRACT, 3=FAULT"
        },
        {
          "id": "skate_status",
          "label": "CWK Skate",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 5,
          "plcTag": "CWK Skate-1=IDLE, 2=PARKING POSITION, 3=FWD CMD, 4=BWD CMD, 5=FAULT"
        },
        {
          "id": "slide_status",
          "label": "CWK Slide",
          "unit": "",
          "precision": 0,
          "defaultMin": -1,
          "defaultMax": 5,
          "plcTag": "CWK Slide-1=IDLE, 2=PARKING POSITION, 3=FWD CMD, 4=BWD CMD, 5=FAULT"
        },
        {
          "id": "source_cmd",
          "label": "CWK Sourcecmd-0 = UNKNOWN, 1 = DCC, 2 = RADIOCONTROL",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "CWK sourcecmd-0 = UNKNOWN, 1 = DCC, 2 = RADIOCONTROL"
        },
        {
          "id": "status",
          "label": "CWK Status",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "CWK status-0= NOT IN PARK POSITION, 1=PARK POSITION "
        }
      ]
    },
    {
      "id": "pct",
      "label": "PCT",
      "fields": [
        {
          "id": "clamp_low_pressure",
          "label": "Clamp Lower Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 300,
          "plcTag": "PCT Clamp low close pressure"
        },
        {
          "id": "clamp_up_pressure",
          "label": "Clamp Upper Pressure",
          "unit": "bar",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 300,
          "plcTag": "PCT Clamp up close pressure"
        },
        {
          "id": "last_makeup_torque",
          "label": "Last Makeup Torque",
          "unit": "daN.m",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 20000,
          "plcTag": "PCT ClampLastMakeUpTorque-daN*m"
        },
        {
          "id": "makeup_torque",
          "label": "Makeup Torque",
          "unit": "daN.m",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 20000,
          "plcTag": "PCT Makeup Torque-daN*m"
        },
        {
          "id": "clamp_low_force",
          "label": "PCT Clamp Low ActCloseForce",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "PCT Clamp low ActCloseForce"
        },
        {
          "id": "clamp_low_force_ok",
          "label": "PCT Clamp Low ActCloseForce Ok",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "PCT Clamp low ActCloseForce ok"
        },
        {
          "id": "clamp_low_pressure_ok",
          "label": "PCT Clamp Low Close Pressure Ok",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "PCT Clamp low close pressure ok"
        },
        {
          "id": "clamp_low_open_ok",
          "label": "PCT Clamp Low Open Pressure Ok",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "PCT Clamp low open pressure ok"
        },
        {
          "id": "clamp_rotation_status",
          "label": "PCT Clamp Roatation",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5,
          "plcTag": "PCT Clamp Roatation-0=NONE, 1=NOT ALLIGNED, 2=ALLIGNED, 3=MAKE-UP, 4=BREAK-OUT, 5=FAULT"
        },
        {
          "id": "clamp_up_force",
          "label": "PCT Clamp Up ActCloseForce",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "PCT Clamp up ActCloseForce"
        },
        {
          "id": "clamp_up_force_ok",
          "label": "PCT Clamp Up ActCloseForce Ok",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "PCT Clamp up ActCloseForce ok"
        },
        {
          "id": "clamp_up_pressure_ok",
          "label": "PCT Clamp Up Close Pressure Ok",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "PCT Clamp up close pressure ok"
        },
        {
          "id": "clamp_up_open_ok",
          "label": "PCT Clamp Up Open Pressure Ok",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1,
          "plcTag": "PCT Clamp up open pressure ok"
        },
        {
          "id": "clamp_low_status",
          "label": "PCT Clamplow",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5,
          "plcTag": "PCT Clamplow-0=NONE, 1=OPENING, 2=CLOSING, 3=IS OPEN, 4=IS CLOSE, 5=FAULT"
        },
        {
          "id": "clamp_up_status",
          "label": "PCT ClampUp",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 5,
          "plcTag": "PCT ClampUp-0=NONE, 1=OPENING, 2=CLOSING, 3=IS OPEN, 4=IS CLOSE, 5=FAULT"
        },
        {
          "id": "dolly_direction",
          "label": "PCT DOLLY UP DOWN",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "PCT DOLLY UP DOWN-0=NO CMD ACTIVE, 1=MOVE UP, 2=MOVE DOWN"
        },
        {
          "id": "dolly_status",
          "label": "PCT DollyWorkPark",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 6,
          "plcTag": "PCT DollyWorkPark-0=NONE, 1=OUT PARK. POS, 2=MOVE WORK, 3=MOVE PARK, 4=IN PARK, 5=FAULT, 6=in work"
        },
        {
          "id": "op_mode",
          "label": "PCT Operation Mode-0 = UNKNOWN, 1 = NORMAL, 2 = MANUAL",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "PCT Operation mode-0 = UNKNOWN, 1 = NORMAL, 2 = MANUAL"
        },
        {
          "id": "rotation_breakout_pressure",
          "label": "PCT ROTATION ActBOutPress",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "PCT ROTATION ActBOutPress"
        },
        {
          "id": "rotation_makeup_pressure",
          "label": "PCT ROTATION ActMakeUpPress",
          "unit": "",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 500,
          "plcTag": "PCT ROTATION ActMakeUpPress"
        },
        {
          "id": "sequence",
          "label": "PCT Sequence",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 4,
          "plcTag": "PCT Sequence-0=OFF, 1=MAKE-UP, 2=BREAK-OUT, 3=RESET, 4=FAULT"
        },
        {
          "id": "spinner_floating",
          "label": "PCT SPINNER FLOATING",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 10,
          "plcTag": "PCT SPINNER FLOATING-0=OFF, 1=ON, 10=SPINNER NOT MOUNTED"
        },
        {
          "id": "spinner_gripper_status",
          "label": "PCT SPINNER GRIPPER",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 10,
          "plcTag": "PCT SPINNER GRIPPER-0=NONE, 1=OPENING, 2=CLOSING, 3=OPEN, 4=CLOSE, 5=FAULT, 10=SPINNER NOT MOUNTED"
        },
        {
          "id": "spinner_rotation_status",
          "label": "PCT Spinner Rotation",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 10,
          "plcTag": "PCT Spinner Rotation-0=NO CMD ACTIVE, 1=FULLY UP, 2=FULLY DOWN, 3=MAKE-UP, 4= BREAK-OUT. 10=SPINNER NOT MOUNTED"
        },
        {
          "id": "spinner_breakout_torque",
          "label": "PCT SpinnerActBOutTorque",
          "unit": "daN.m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 20000,
          "plcTag": "PCT SpinnerActBOutTorque-daN*m"
        },
        {
          "id": "spinner_makeup_torque",
          "label": "PCT SpinnerActMakeUpTorque",
          "unit": "daN.m",
          "precision": 1,
          "defaultMin": 0,
          "defaultMax": 20000,
          "plcTag": "PCT SpinnerActMakeUpTorque-daN*m"
        },
        {
          "id": "status",
          "label": "PCT STATUS-0 = OFF, 1 = ON In IDLE, 2 = ON",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 2,
          "plcTag": "PCT STATUS-0 = OFF, 1 = ON in IDLE, 2 = ON"
        }
      ]
    },
    {
      "id": "opcua_demo",
      "label": "OPC UA (device)",
      "fields": [
        {
          "id": "dip",
          "label": "Dip Signal",
          "unit": "",
          "precision": 1,
          "defaultMin": -100,
          "defaultMax": 100,
          "plcTag": "opcua_demo.dip"
        },
        {
          "id": "fast_counter",
          "label": "Fast Counter",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "opcua_demo.fast_counter"
        },
        {
          "id": "random_uint",
          "label": "Random Uint",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 4000000,
          "plcTag": "opcua_demo.random_uint"
        },
        {
          "id": "slow_counter",
          "label": "Slow Counter",
          "unit": "",
          "precision": 0,
          "defaultMin": 0,
          "defaultMax": 1000,
          "plcTag": "opcua_demo.slow_counter"
        },
        {
          "id": "spike",
          "label": "Spike Signal",
          "unit": "",
          "precision": 1,
          "defaultMin": -100,
          "defaultMax": 100,
          "plcTag": "opcua_demo.spike"
        }
      ]
    }
  ],
  "defaultLayout": {
    "stripCount": 3,
    "pensPerStrip": 2,
    "strips": [
      {
        "id": "strip-1",
        "title": "Engine / Hookload",
        "pens": [
          {
            "id": "s1p1",
            "metric": "cat_engine.rpm",
            "min": 0,
            "max": 2000,
            "color": "#38bdf8"
          },
          {
            "id": "s1p2",
            "metric": "drawworks.hook_load",
            "min": 0,
            "max": 500,
            "color": "#fbbf24"
          }
        ]
      },
      {
        "id": "strip-2",
        "title": "Pump",
        "pens": [
          {
            "id": "s2p1",
            "metric": "mudpump.pressure",
            "min": 0,
            "max": 500,
            "color": "#4ade80"
          },
          {
            "id": "s2p2",
            "metric": "mudpump.spm",
            "min": 0,
            "max": 200,
            "color": "#f472b6"
          }
        ]
      },
      {
        "id": "strip-3",
        "title": "Engine Health",
        "pens": [
          {
            "id": "s3p1",
            "metric": "cat_engine.coolant_temp",
            "min": 0,
            "max": 120,
            "color": "#a78bfa"
          },
          {
            "id": "s3p2",
            "metric": "cat_engine.oil_pressure",
            "min": 0,
            "max": 10,
            "color": "#fb7185"
          }
        ]
      }
    ]
  }
};

// Standalone defaults for another project.
// Backend should proxy /api and /socket.io, same as this AHWR project.
// If your login token key is different, change TOKEN_KEY below.
const TOKEN_KEY = 'romii_token';
axios.defaults.baseURL = axios.defaults.baseURL || '';
if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) axios.defaults.headers.common.Authorization = 'Bearer ' + storedToken;
}

const socket = io('/', {
    auth: (cb) => cb({ token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null })
});
import * as XLSX from 'xlsx';

/*
 * EdrView — reusable, self-contained strip-chart Electronic Drilling Recorder.
 *
 * Rendering is a hand-rolled SVG strip renderer (no recharts) so we control the
 * strip look exactly: shared vertical index axis (time OR depth), multiple pens
 * per strip each on its OWN horizontal [min,max] scale + color, light gridlines,
 * a thin current-value marker, and a FIXED-HEIGHT bottom "variables" block whose
 * content adaptively compacts so every strip's block is the same height and the
 * blocks line up on a shared baseline regardless of pen count.
 *
 * Data plumbing reuses the shared authenticated axios (/api/history seed +
 * /api/rig/latest) and the shared socket (`rig_data`) — no new instances.
 */

// ---------------------------------------------------------------------------
// Catalog helpers
// ---------------------------------------------------------------------------

const METRIC_OPTIONS = edrCatalog.categories.flatMap(category => (
    category.fields.map(field => ({
        id: `${category.id}.${field.id}`,
        label: field.label,
        unit: field.unit || '',
        precision: field.precision ?? 1,
        defaultMin: field.defaultMin ?? 0,
        defaultMax: field.defaultMax ?? 1,
        categoryId: category.id,
        categoryLabel: category.label
    }))
));
const METRIC_LOOKUP = new Map(METRIC_OPTIONS.map(o => [o.id, o]));
const ALL_METRIC_IDS = METRIC_OPTIONS.map(o => o.id);

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const PEN_COLORS = ['#38bdf8', '#fbbf24', '#4ade80', '#f472b6', '#a78bfa', '#fb7185', '#22d3ee', '#f97316'];
const MAX_PENS = 3;
const MAX_READOUTS = 6;
const DEPTH_INDEX_METRIC = 'drilling.hole_depth';
const DEPTH_BIN_M = 0.5;

// Always-on left-band depth readouts (full mode only).
const HOLE_DEPTH_METRIC = 'drilling.hole_depth';
const BIT_DEPTH_METRIC = 'drilling.bit_depth';

const channelLabel = (id) => METRIC_LOOKUP.get(id)?.label || id.replace(/[._]/g, ' ');
const channelUnit = (id) => METRIC_LOOKUP.get(id)?.unit || '';
const channelPrecision = (id) => METRIC_LOOKUP.get(id)?.precision ?? 1;
const channelCategory = (id) => METRIC_LOOKUP.get(id)?.categoryLabel || '';

const fmtValue = (value, precision) => {
    if (!Number.isFinite(Number(value))) return '--';
    return Number(value).toFixed(precision);
};

// Trim trailing zeros for compact scale text (0…500 not 0.0…500.0).
const fmtScale = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '--';
    return String(Math.round(n * 100) / 100);
};

const clampCustomMinutes = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return DEFAULT_CUSTOM_TIME_MINUTES;
    return Math.max(1, Math.min(MAX_CUSTOM_TIME_MINUTES, Math.round(n)));
};

const formatAxisTime = (value, spanMs) => {
    const options = spanMs >= 12 * 60 * 60 * 1000
        ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
        : spanMs >= 60 * 60 * 1000
            ? { hour: '2-digit', minute: '2-digit', hour12: false }
            : { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    return new Date(value).toLocaleString([], options);
};

const toDateTimeLocal = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDateTimeLocal = (value) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? new Date(time).toISOString() : '';
};

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvEscape = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildExportRows = (rows, metrics) => rows.map(row => {
    const out = {
        Time: Number.isFinite(Number(row.timestamp))
            ? new Date(Number(row.timestamp)).toISOString()
            : '',
        'Hole Depth': row[HOLE_DEPTH_METRIC] ?? row['drilling.hole_depth'] ?? '',
        'Bit Depth': row[BIT_DEPTH_METRIC] ?? row['drilling.bit_depth'] ?? ''
    };
    metrics.forEach(id => {
        out[channelLabel(id)] = row[id] ?? '';
    });
    return out;
});

const exportRowsAsCsv = (rows, filename) => {
    const headers = Object.keys(rows[0] || { Time: '' });
    const csv = [
        headers.map(csvEscape).join(','),
        ...rows.map(row => headers.map(h => csvEscape(row[h])).join(','))
    ].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
};

const exportRowsAsXlsx = (rows, filename) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EDR Data');
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
};

const xmlEscape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const exportRowsAsPng = async (historyRows, metrics, filename) => {
    const width = 1400;
    const height = 820;
    const pad = { left: 72, right: 40, top: 72, bottom: 82 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const rows = historyRows
        .filter(row => Number.isFinite(Number(row.timestamp)))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    const t0 = rows[0]?.timestamp ?? Date.now() - 1;
    const t1 = rows[rows.length - 1]?.timestamp ?? Date.now();
    const span = Math.max(1, t1 - t0);
    const selected = metrics.slice(0, 8);
    const paths = selected.map((metric, index) => {
        const meta = METRIC_LOOKUP.get(metric);
        const min = Number(meta?.defaultMin ?? 0);
        const max = Number(meta?.defaultMax ?? 1);
        const range = max > min ? max - min : 1;
        const color = PEN_COLORS[index % PEN_COLORS.length];
        const points = rows
            .map(row => {
                const val = Number(row[metric]);
                if (!Number.isFinite(val)) return null;
                const x = pad.left + ((Number(row.timestamp) - t0) / span) * plotW;
                const y = pad.top + (1 - Math.max(0, Math.min(1, (val - min) / range))) * plotH;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .filter(Boolean);
        return points.length > 1
            ? `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
            : '';
    }).join('');
    const grid = Array.from({ length: 7 }, (_, i) => {
        const y = pad.top + (i / 6) * plotH;
        return `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}" stroke="#263241" stroke-width="1"/>`;
    }).join('') + Array.from({ length: 9 }, (_, i) => {
        const x = pad.left + (i / 8) * plotW;
        return `<line y1="${pad.top}" y2="${height - pad.bottom}" x1="${x}" x2="${x}" stroke="#263241" stroke-width="1"/>`;
    }).join('');
    const legend = selected.map((metric, index) => {
        const x = pad.left + (index % 4) * 300;
        const y = height - 48 + Math.floor(index / 4) * 24;
        const color = PEN_COLORS[index % PEN_COLORS.length];
        return `<rect x="${x}" y="${y - 10}" width="12" height="12" rx="2" fill="${color}"/><text x="${x + 20}" y="${y}" fill="#e5eefb" font-size="16" font-weight="700">${xmlEscape(channelLabel(metric))}</text>`;
    }).join('');
    const subtitle = rows.length
        ? `${new Date(t0).toLocaleString()} - ${new Date(t1).toLocaleString()}`
        : 'No data';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#05070b"/>
        <text x="${pad.left}" y="38" fill="#ffffff" font-size="28" font-weight="900">Electronic Drilling Recorder Export</text>
        <text x="${pad.left}" y="62" fill="#94a3b8" font-size="15">${xmlEscape(subtitle)}</text>
        <rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="#020407" stroke="#334155"/>
        ${grid}
        ${paths}
        ${legend}
    </svg>`;
    const img = new window.Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) downloadBlob(blob, filename);
};

// ---------------------------------------------------------------------------
// Time window presets
// ---------------------------------------------------------------------------

const TIME_WINDOWS = [
    { label: '1m', ms: 1 * 60 * 1000, range: '-1m' },
    { label: '5m', ms: 5 * 60 * 1000, range: '-5m' },
    { label: '15m', ms: 15 * 60 * 1000, range: '-15m' },
    { label: '30m', ms: 30 * 60 * 1000, range: '-30m' },
    { label: '1H', ms: 60 * 60 * 1000, range: '-1h' },
    { label: '2H', ms: 2 * 60 * 60 * 1000, range: '-2h' },
    { label: '4H', ms: 4 * 60 * 60 * 1000, range: '-4h' },
    { label: '6H', ms: 6 * 60 * 60 * 1000, range: '-6h' },
    { label: '12H', ms: 12 * 60 * 60 * 1000, range: '-12h' },
    { label: '24H', ms: 24 * 60 * 60 * 1000, range: '-24h' }
];
const CUSTOM_TIME_KEY = 'custom';
const DEFAULT_CUSTOM_TIME_MINUTES = 60;
const MAX_CUSTOM_TIME_MINUTES = 24 * 60;
const EXPORT_RANGES = [
    { key: '-15m', label: 'LAST 15 MIN' },
    { key: '-1h', label: 'LAST 1 HOUR' },
    { key: '-6h', label: 'LAST 6 HOURS' },
    { key: '-12h', label: 'LAST 12 HOURS' },
    { key: '-24h', label: 'LAST 24 HOURS' },
    { key: '-3d', label: 'LAST 3 DAYS' },
    { key: '-7d', label: 'LAST 7 DAYS' },
    { key: '-30d', label: 'LAST 30 DAYS' }
];
const DEPTH_SPANS = [
    { label: '25m', m: 25 },
    { label: '50m', m: 50 },
    { label: '100m', m: 100 },
    { label: '250m', m: 250 },
    { label: '500m', m: 500 }
];

// ---------------------------------------------------------------------------
// Config normalization / persistence
// ---------------------------------------------------------------------------

const normalizePen = (pen, fallbackColorIndex) => {
    const src = pen && typeof pen === 'object' ? pen : {};
    const channelId = METRIC_LOOKUP.has(src.channelId) ? src.channelId : ALL_METRIC_IDS[0];
    const meta = METRIC_LOOKUP.get(channelId);
    let min = Number.isFinite(Number(src.min)) ? Number(src.min) : (meta?.defaultMin ?? 0);
    let max = Number.isFinite(Number(src.max)) ? Number(src.max) : (meta?.defaultMax ?? 1);
    if (max <= min) max = min + 1;
    return {
        channelId,
        min,
        max,
        color: COLOR_RE.test(src.color || '') ? src.color : PEN_COLORS[fallbackColorIndex % PEN_COLORS.length],
        enabled: src.enabled !== false
    };
};

const normalizeStrips = (strips) => {
    if (!Array.isArray(strips)) return [];
    return strips.map((strip, si) => ({
        title: typeof strip?.title === 'string' && strip.title ? strip.title : `Track ${si + 1}`,
        pens: (Array.isArray(strip?.pens) ? strip.pens : [])
            .slice(0, MAX_PENS)
            .map((pen, pi) => normalizePen(pen, si + pi))
    }));
};

// Keep only known channels, dedupe, cap to MAX_READOUTS.
const normalizeReadouts = (ids) => {
    if (!Array.isArray(ids)) return [];
    const seen = new Set();
    const out = [];
    ids.forEach(id => {
        if (METRIC_LOOKUP.has(id) && !seen.has(id)) {
            seen.add(id);
            out.push(id);
        }
    });
    return out.slice(0, MAX_READOUTS);
};

const loadPersisted = (storageKey, defaultStrips, defaultReadouts) => {
    const fallback = {
        strips: normalizeStrips(defaultStrips),
        indexMode: 'time',
        readouts: normalizeReadouts(defaultReadouts)
    };
    if (!storageKey) return fallback;
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        const strips = normalizeStrips(parsed?.strips);
        // Only adopt a persisted readout list if the key has one saved; otherwise
        // fall back to the prop default (covers first run after this feature ships).
        const readouts = Array.isArray(parsed?.readouts)
            ? normalizeReadouts(parsed.readouts)
            : fallback.readouts;
        return {
            strips: strips.length ? strips : fallback.strips,
            indexMode: parsed?.indexMode === 'depth' ? 'depth' : 'time',
            readouts
        };
    } catch (e) {
        return fallback;
    }
};

// ---------------------------------------------------------------------------
// Channel select (grouped by category)
// ---------------------------------------------------------------------------

function ChannelSelect({ value, onChange, channels, sx }) {
    const allowed = channels && channels.length
        ? new Set(channels)
        : null;
    const groups = edrCatalog.categories
        .map(cat => ({
            cat,
            fields: cat.fields.filter(f => !allowed || allowed.has(`${cat.id}.${f.id}`))
        }))
        .filter(g => g.fields.length);
    return (
        <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            size="small"
            MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
            sx={sx}
        >
            {groups.flatMap(({ cat, fields }) => [
                <ListSubheader key={`h-${cat.id}`} sx={{ fontWeight: 800, lineHeight: '30px', fontSize: '0.72rem', letterSpacing: 0.4 }}>
                    {cat.label.toUpperCase()}
                </ListSubheader>,
                ...fields.map(f => (
                    <MenuItem key={`${cat.id}.${f.id}`} value={`${cat.id}.${f.id}`} sx={{ fontSize: '0.82rem' }}>
                        {f.label}{f.unit ? ` (${f.unit})` : ''}
                    </MenuItem>
                ))
            ])}
        </Select>
    );
}

// ---------------------------------------------------------------------------
// Readouts config (multi-select from the catalog, grouped by category)
// ---------------------------------------------------------------------------

function ReadoutsConfig({ value, onChange, channels, surface, border, text, subText, accent }) {
    const allowed = channels && channels.length ? new Set(channels) : null;
    const groups = edrCatalog.categories
        .map(cat => ({
            cat,
            fields: cat.fields.filter(f => !allowed || allowed.has(`${cat.id}.${f.id}`))
        }))
        .filter(g => g.fields.length);

    const handleChange = (e) => {
        const next = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
        onChange(normalizeReadouts(next));
    };

    return (
        <FormControl size="small">
            <Select
                multiple
                displayEmpty
                value={value}
                onChange={handleChange}
                MenuProps={{ PaperProps: { sx: { maxHeight: 380, bgcolor: surface, color: text } } }}
                IconComponent={() => null}
                renderValue={() => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: subText }}>
                        <SlidersHorizontal size={15} />
                        <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                            Readouts
                        </Box>
                    </Box>
                )}
                sx={{
                    color: text,
                    bgcolor: surface,
                    '& .MuiSelect-select': { py: 0.45, pl: 1, pr: '10px !important' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: accent }
                }}
            >
                <ListSubheader sx={{ bgcolor: surface, color: subText, fontWeight: 800, fontSize: '0.66rem', lineHeight: '26px', letterSpacing: 0.4 }}>
                    PICK READOUTS ({value.length}/{MAX_READOUTS})
                </ListSubheader>
                {groups.flatMap(({ cat, fields }) => [
                    <ListSubheader key={`h-${cat.id}`} sx={{ bgcolor: surface, fontWeight: 800, lineHeight: '28px', fontSize: '0.7rem', letterSpacing: 0.4, color: subText }}>
                        {cat.label.toUpperCase()}
                    </ListSubheader>,
                    ...fields.map(f => {
                        const id = `${cat.id}.${f.id}`;
                        const checked = value.includes(id);
                        const atCap = !checked && value.length >= MAX_READOUTS;
                        return (
                            <MenuItem key={id} value={id} disabled={atCap} sx={{ py: 0.25, fontSize: '0.82rem' }}>
                                <Checkbox size="small" checked={checked} sx={{ p: 0.5, mr: 0.5, color: subText, '&.Mui-checked': { color: accent } }} />
                                <ListItemText
                                    primary={`${f.label}${f.unit ? ` (${f.unit})` : ''}`}
                                    primaryTypographyProps={{ sx: { fontSize: '0.82rem' } }}
                                />
                            </MenuItem>
                        );
                    })
                ])}
            </Select>
        </FormControl>
    );
}

// ---------------------------------------------------------------------------
// Big numeric readout tile (top row + left depth band share this look)
// ---------------------------------------------------------------------------

function ReadoutTile({ id, value, surface, border, text, subText, accent, valueColor, valueSize = '1.85rem', minWidth = 132, showCategory = true }) {
    return (
        <Paper
            elevation={0}
            sx={{
                flex: '1 1 0',
                minWidth,
                bgcolor: surface,
                border: `1px solid ${border}`,
                borderRadius: 1.5,
                px: 1.5,
                py: 0.85,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 0.1,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <Box sx={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2, bgcolor: accent, opacity: 0.85 }} />
            <Typography sx={{ color: subText, fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {channelLabel(id)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography sx={{ color: valueColor || text, fontSize: valueSize, fontWeight: 900, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtValue(value, channelPrecision(id))}
                </Typography>
                <Typography sx={{ color: subText, fontSize: '0.72rem', fontWeight: 700 }}>{channelUnit(id)}</Typography>
            </Box>
            {showCategory && (
                <Typography sx={{ color: subText, fontSize: '0.54rem', opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {channelCategory(id)}
                </Typography>
            )}
        </Paper>
    );
}

// ---------------------------------------------------------------------------
// Vertical scroll rail (up/down) — placed on BOTH left and right edges
// ---------------------------------------------------------------------------

function ScrollRail({ onUp, onDown, onHoldUp, onHoldDown, onHoldStop, upTip, downTip, downDisabled, text, border, top, bottom }) {
    const btnSx = {
        color: text,
        border: `1px solid ${border}`,
        borderRadius: 1,
        p: 0.35
    };
    // Press-and-hold: start a repeating scroll on pointer-down, stop on up/leave.
    // The onClick still fires for a quick tap = exactly one step.
    const holdProps = (onHold) => ({
        onPointerDown: (e) => { if (e.button === 0) onHold?.(); },
        onPointerUp: onHoldStop,
        onPointerLeave: onHoldStop,
        onPointerCancel: onHoldStop
    });
    return (
        <Box
            sx={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: `${top}px`,
                mb: `${bottom}px`
            }}
        >
            <MuiTooltip title={upTip} placement="left">
                <span><IconButton size="small" onClick={onUp} {...holdProps(onHoldUp)} sx={btnSx}><ChevronsUp size={16} /></IconButton></span>
            </MuiTooltip>
            <MuiTooltip title={downTip} placement="left">
                <span><IconButton size="small" onClick={onDown} disabled={downDisabled} {...(downDisabled ? {} : holdProps(onHoldDown))} sx={btnSx}><ChevronsDown size={16} /></IconButton></span>
            </MuiTooltip>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// SVG strip chart
// ---------------------------------------------------------------------------

function StripChart({ strip, samples, indexMode, indexDomain, accentColor, gridColor, axisTextColor, surface, border, subText, textColor }) {
    const ref = useRef(null);
    const [size, setSize] = useState({ w: 240, h: 260 });
    // Hovered cursor position, in fractional [0..1] of chart height (null = no hover).
    // We keep only this lightweight state and recompute the tooltip contents on
    // render — updates are throttled via requestAnimationFrame in the move handler.
    const [cursorFrac, setCursorFrac] = useState(null);
    const rafRef = useRef(0);
    const pendingFracRef = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(entries => {
            const cr = entries[0]?.contentRect;
            if (cr) setSize({ w: Math.max(40, cr.width), h: Math.max(40, cr.height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Flush any scheduled rAF on unmount.
    useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

    const enabledPens = strip.pens.filter(p => p.enabled);
    const { w, h } = size;
    const padX = 6;
    const innerW = Math.max(1, w - padX * 2);

    // Vertical gridlines (5 columns).
    const vLines = [0.25, 0.5, 0.75].map(f => padX + f * innerW);
    // Horizontal gridlines map to the shared index domain.
    const [d0, d1] = indexDomain;
    const span = d1 - d0 || 1;
    const yFor = (idx) => ((idx - d0) / span) * h;

    const hTickCount = Math.max(2, Math.min(8, Math.round(h / 48)));
    const hLines = Array.from({ length: hTickCount + 1 }, (_, i) => (i / hTickCount));

    // --- Hover crosshair / tooltip plumbing ---
    // Pointer Y -> fraction of height, scheduled on rAF so mousemove can't thrash.
    const handleMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (!rect.height) return;
        const frac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        pendingFracRef.current = frac;
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            setCursorFrac(pendingFracRef.current);
        });
    };
    const handleLeave = () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        pendingFracRef.current = null;
        setCursorFrac(null);
    };

    // Index value under the cursor (timestamp in time mode, depth in depth mode).
    const cursorIndex = cursorFrac == null ? null : d0 + cursorFrac * span;

    // Nearest sample to the cursor index (linear scan — samples are sorted by
    // timestamp/depth; cheap for the ~window-sized buffers we hold).
    const nearestSample = useMemo(() => {
        if (cursorIndex == null || !samples.length) return null;
        const key = indexMode === 'depth' ? 'depth' : 'timestamp';
        let best = null;
        let bestDist = Infinity;
        for (let i = 0; i < samples.length; i += 1) {
            const iv = samples[i][key];
            if (!Number.isFinite(iv)) continue;
            const dist = Math.abs(iv - cursorIndex);
            if (dist < bestDist) { bestDist = dist; best = samples[i]; }
        }
        return best;
    }, [cursorIndex, samples, indexMode]);

    const fmtIndex = (v) => (
        indexMode === 'depth'
            ? `${fmtScale(v)} m`
            : new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    );

    // Tooltip box geometry — clamp inside the strip and flip side near edges.
    const showTooltip = cursorFrac != null && nearestSample && enabledPens.length > 0;
    const tipRows = showTooltip
        ? enabledPens.map(pen => ({
            color: pen.color,
            name: channelLabel(pen.channelId),
            unit: channelUnit(pen.channelId),
            value: fmtValue(nearestSample.values[pen.channelId], channelPrecision(pen.channelId))
        }))
        : [];

    const buildPath = (pen) => {
        const range = pen.max - pen.min || 1;
        let dStr = '';
        let started = false;
        for (let i = 0; i < samples.length; i += 1) {
            const s = samples[i];
            const raw = s.values[pen.channelId];
            const idx = indexMode === 'depth' ? s.depth : s.timestamp;
            if (!Number.isFinite(Number(raw)) || !Number.isFinite(Number(idx))) {
                started = false; // break the line over gaps
                continue;
            }
            const clamped = Math.max(pen.min, Math.min(pen.max, Number(raw)));
            const x = padX + ((clamped - pen.min) / range) * innerW;
            const y = yFor(idx);
            dStr += `${started ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
            started = true;
        }
        return dStr;
    };

    // Current value position for the thin marker (latest sample with a value).
    const markerFor = (pen) => {
        for (let i = samples.length - 1; i >= 0; i -= 1) {
            const raw = samples[i].values[pen.channelId];
            if (Number.isFinite(Number(raw))) {
                const range = pen.max - pen.min || 1;
                const clamped = Math.max(pen.min, Math.min(pen.max, Number(raw)));
                return padX + ((clamped - pen.min) / range) * innerW;
            }
        }
        return null;
    };

    return (
        <Box
            ref={ref}
            onPointerMove={handleMove}
            onPointerLeave={handleLeave}
            sx={{ position: 'relative', width: '100%', height: '100%' }}
        >
            <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                {/* horizontal index gridlines */}
                {hLines.map((f, i) => (
                    <line key={`h${i}`} x1={0} x2={w} y1={f * h} y2={f * h} stroke={gridColor} strokeWidth={0.5} />
                ))}
                {/* vertical scale gridlines */}
                {vLines.map((x, i) => (
                    <line key={`v${i}`} x1={x} x2={x} y1={0} y2={h} stroke={gridColor} strokeWidth={0.5} />
                ))}
                {/* pens */}
                {enabledPens.map((pen, i) => (
                    <path
                        key={`p${i}`}
                        d={buildPath(pen)}
                        fill="none"
                        stroke={pen.color}
                        strokeWidth={1.6}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
                {/* thin current-value markers */}
                {enabledPens.map((pen, i) => {
                    const mx = markerFor(pen);
                    if (mx == null) return null;
                    return (
                        <line
                            key={`m${i}`}
                            x1={mx}
                            x2={mx}
                            y1={0}
                            y2={h}
                            stroke={pen.color}
                            strokeWidth={0.75}
                            strokeDasharray="2 3"
                            opacity={0.5}
                            vectorEffect="non-scaling-stroke"
                        />
                    );
                })}
                {/* hover crosshair (thin horizontal cursor line at the hovered index) */}
                {cursorFrac != null && (
                    <line
                        x1={0}
                        x2={w}
                        y1={cursorFrac * h}
                        y2={cursorFrac * h}
                        stroke={accentColor}
                        strokeWidth={1}
                        opacity={0.85}
                        pointerEvents="none"
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </svg>
            {/* hover tooltip — index value + per-pen color/name/value at nearest sample */}
            {showTooltip && (
                <Box
                    sx={{
                        position: 'absolute',
                        left: cursorFrac > 0.5 ? 4 : 'auto',
                        right: cursorFrac > 0.5 ? 'auto' : 4,
                        // place near the cursor but keep the box on-screen vertically
                        top: `${Math.max(2, Math.min(82, cursorFrac * 100))}%`,
                        zIndex: 5,
                        pointerEvents: 'none',
                        bgcolor: surface,
                        border: `1px solid ${border}`,
                        borderRadius: 1,
                        boxShadow: 3,
                        px: 0.85,
                        py: 0.6,
                        maxWidth: '92%',
                        minWidth: 0
                    }}
                >
                    <Typography sx={{ color: subText, fontSize: '0.6rem', fontWeight: 800, letterSpacing: 0.3, mb: 0.35, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtIndex(cursorIndex)}
                    </Typography>
                    {tipRows.map((r, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, lineHeight: 1.25 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: r.color, flex: '0 0 auto' }} />
                            <Typography component="span" sx={{ color: textColor, fontSize: '0.62rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
                                {r.name}
                            </Typography>
                            <Typography component="span" sx={{ color: r.color, fontSize: '0.66rem', fontWeight: 900, ml: 'auto', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                {r.value}{r.unit ? <Box component="span" sx={{ color: subText, fontSize: '0.85em', fontWeight: 700, ml: 0.25 }}>{r.unit}</Box> : null}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
            {enabledPens.length === 0 && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                    <Typography sx={{ color: axisTextColor, fontSize: '0.7rem', opacity: 0.6 }}>No pens</Typography>
                </Box>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Fixed-height bottom "variables" block — the critical requirement.
//
// Always exactly BOTTOM_H tall. Content adapts to pen count so 1 pen is
// comfortable and 3 pens still fit the SAME height. Compaction order as the
// per-row height shrinks: (1) smaller font, (2) drop min…max scale, (3) drop
// NAME (keep unit), (4) keep only the color-coded VALUE.
// ---------------------------------------------------------------------------

function StripVariables({ strip, latest, compact, surface, border, subText }) {
    const BOTTOM_H = compact ? 64 : 96;
    const enabledPens = strip.pens.filter(p => p.enabled);
    const n = Math.max(1, enabledPens.length);
    const rowH = BOTTOM_H / Math.max(n, compact ? 2 : 1); // reserve at least 2 slots in compact

    // Compaction thresholds keyed off available per-row height.
    const fontValue = rowH >= 40 ? '1.15rem' : rowH >= 30 ? '0.98rem' : rowH >= 22 ? '0.86rem' : '0.78rem';
    const fontMeta = rowH >= 30 ? '0.62rem' : '0.58rem';
    const showScale = rowH >= 30;     // (2) drop scale first
    const showName = rowH >= 24;      // (3) then name (keep unit)

    return (
        <Box
            sx={{
                flex: `0 0 ${BOTTOM_H}px`,
                height: BOTTOM_H,
                mt: 0.5,
                bgcolor: surface,
                border: `1px solid ${border}`,
                borderRadius: 1,
                px: 0.75,
                py: 0.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-evenly',
                overflow: 'hidden'
            }}
        >
            {enabledPens.length === 0 ? (
                <Typography sx={{ color: subText, fontSize: '0.7rem', textAlign: 'center', alignSelf: 'center' }}>—</Typography>
            ) : enabledPens.map((pen, i) => {
                const unit = channelUnit(pen.channelId);
                const value = latest?.[pen.channelId];
                // Full-detail tooltip so a compacted row (unit-only / value-only) is
                // still identifiable on hover: Name (unit) · min…max · current value.
                const tipTitle = `${channelLabel(pen.channelId)}${unit ? ` (${unit})` : ''} · ${fmtScale(pen.min)}…${fmtScale(pen.max)} · ${fmtValue(value, channelPrecision(pen.channelId))}${unit ? ` ${unit}` : ''}`;
                return (
                    <MuiTooltip key={i} title={tipTitle} placement="top" arrow>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.6,
                            minWidth: 0,
                            lineHeight: 1.05,
                            cursor: 'default'
                        }}
                    >
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: pen.color, flex: '0 0 auto' }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                            <Typography
                                component="div"
                                sx={{
                                    color: subText,
                                    fontSize: fontMeta,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.2,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {/* compaction (3): drop NAME, keep unit */}
                                {showName
                                    ? `${channelLabel(pen.channelId)}${unit ? ` (${unit})` : ''}`
                                    : (unit || channelLabel(pen.channelId))}
                                {/* compaction (2): drop min…max scale first */}
                                {showScale && (
                                    <Box component="span" sx={{ opacity: 0.7, ml: 0.5 }}>
                                        · {fmtScale(pen.min)}…{fmtScale(pen.max)}
                                    </Box>
                                )}
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                color: pen.color,
                                fontSize: fontValue,
                                fontWeight: 900,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                                flex: '0 0 auto'
                            }}
                        >
                            {fmtValue(value, channelPrecision(pen.channelId))}
                            {/* compaction (4): when name+unit are dropped from the meta line, keep unit beside the value */}
                            {!showName && unit ? (
                                <Box component="span" sx={{ fontSize: '0.6em', ml: 0.3, color: subText, fontWeight: 700 }}>{unit}</Box>
                            ) : null}
                        </Typography>
                    </Box>
                    </MuiTooltip>
                );
            })}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Depth track — the leftmost EDR column.
//
// Reuses the EXACT same row metrics as a pen strip (header height, chart band,
// fixed bottom-block height) so it is header-aligned and baseline-aligned with
// every other strip. The chart band hosts the shared depth/time axis: the same
// horizontal gridlines the strips draw (same hTickCount formula keyed off the
// measured chart height) plus tick labels sitting ON those gridlines, so a
// viewer reads the index across all strips on the same rows. A thin hole-depth
// trace is drawn in depth mode where the bin data supports it. The fixed bottom
// block holds the live HOLE DEPTH + BIT DEPTH readouts on the shared baseline.
//
// Drag-to-scroll on the chart band mirrors the old standalone axis behaviour.
// ---------------------------------------------------------------------------

function DepthAxisChart({
    indexMode,
    indexDomain,
    axisTicks,
    samples,
    maxDepth,
    gridColor,
    subText,
    accent,
    onPointerDown,
    onPointerMove,
    onPointerUp
}) {
    const ref = useRef(null);
    const [size, setSize] = useState({ w: 60, h: 260 });

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(entries => {
            const cr = entries[0]?.contentRect;
            if (cr) setSize({ w: Math.max(20, cr.width), h: Math.max(40, cr.height) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const { w, h } = size;

    // SAME horizontal gridline math as StripChart so labels land on the exact
    // rows the strips draw their gridlines.
    const hTickCount = Math.max(2, Math.min(8, Math.round(h / 48)));
    const hLines = Array.from({ length: hTickCount + 1 }, (_, i) => (i / hTickCount));

    // Thin hole-depth trace (depth mode only — the index IS depth, so the trace
    // is a monotonic diagonal that visually ties depth to the gridlines).
    const [d0, d1] = indexDomain;
    const span = d1 - d0 || 1;
    const depthTracePath = useMemo(() => {
        if (indexMode !== 'depth' || !samples.length) return '';
        // In depth mode the y-position already encodes depth; draw a guide line
        // from the top of the visible window down to the current max depth so the
        // operator sees how much of the window holds real (drilled) hole.
        const yMax = Math.max(0, Math.min(1, (maxDepth - d0) / span)) * h;
        if (yMax <= 0) return '';
        const x = w * 0.5;
        return `M${x.toFixed(1)},0L${x.toFixed(1)},${yMax.toFixed(1)}`;
    }, [indexMode, samples.length, maxDepth, d0, span, h, w]);

    return (
        <Box
            ref={ref}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            sx={{ position: 'relative', width: '100%', height: '100%', cursor: 'ns-resize', userSelect: 'none', touchAction: 'none' }}
        >
            <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                {/* SAME horizontal gridlines as the strips */}
                {hLines.map((f, i) => (
                    <line key={`h${i}`} x1={0} x2={w} y1={f * h} y2={f * h} stroke={gridColor} strokeWidth={0.5} />
                ))}
                {/* thin hole-depth guide trace (depth mode) */}
                {depthTracePath && (
                    <path
                        d={depthTracePath}
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        strokeLinecap="round"
                        opacity={0.85}
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </svg>
            {/* axis unit caption */}
            <Typography sx={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: subText, textTransform: 'uppercase', pointerEvents: 'none' }}>
                {indexMode === 'depth' ? 'm' : 'time'}
            </Typography>
            {/* tick labels pinned to the gridline fractions (axisTicks share the same domain) */}
            {axisTicks.map((t, i) => (
                <Box key={i} sx={{ position: 'absolute', left: 0, right: 0, top: `${(t.labelFrac ?? t.frac) * 100}%`, transform: 'translateY(-50%)', px: 0.25, pointerEvents: 'none' }}>
                    <Typography sx={{ fontSize: '0.62rem', color: subText, textAlign: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {t.label}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

function DepthTrack({
    indexMode,
    indexDomain,
    axisTicks,
    samples,
    maxDepth,
    holeDepthVal,
    bitDepthVal,
    headerH,
    bottomH,
    chartBg,
    panelBg,
    border,
    gridColor,
    text,
    subText,
    accent,
    onPointerDown,
    onPointerMove,
    onPointerUp
}) {
    // HOLE / BIT depth as the bottom block, on the SAME baseline + height as the
    // strips' StripVariables block. We mirror StripVariables' geometry (fixed
    // BOTTOM_H, mt: 0.5) exactly rather than hardcoding divergent values.
    const rows = [
        { id: HOLE_DEPTH_METRIC, value: holeDepthVal, color: '#22d3ee' },
        { id: BIT_DEPTH_METRIC, value: bitDepthVal, color: '#fbbf24' }
    ];
    return (
        <Box sx={{ flex: '0 0 132px', minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* header — same height/style as a strip header, titled DEPTH */}
            <Box sx={{ height: headerH, display: 'flex', alignItems: 'center', gap: 0.5, mb: '4px' }}>
                <Gauge size={14} color={subText} style={{ flex: '0 0 auto' }} />
                <Typography sx={{ flex: 1, minWidth: 0, color: text, fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Depth
                </Typography>
            </Box>
            {/* chart band — same chartTop..chartBottom band as the strips; hosts the depth axis */}
            <Box sx={{ flex: '1 1 auto', minHeight: 0, bgcolor: chartBg, border: `1px solid ${border}`, borderRadius: 1, overflow: 'hidden' }}>
                <DepthAxisChart
                    indexMode={indexMode}
                    indexDomain={indexDomain}
                    axisTicks={axisTicks}
                    samples={samples}
                    maxDepth={maxDepth}
                    gridColor={gridColor}
                    subText={subText}
                    accent={accent}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                />
            </Box>
            {/* fixed-height bottom block — mirrors StripVariables geometry for an exact baseline match */}
            <Box
                sx={{
                    flex: `0 0 ${bottomH}px`,
                    height: bottomH,
                    mt: 0.5,
                    bgcolor: panelBg,
                    border: `1px solid ${border}`,
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-evenly',
                    overflow: 'hidden'
                }}
            >
                {rows.map((r) => {
                    const unit = channelUnit(r.id);
                    return (
                        <Box key={r.id} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.05 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: r.color, flex: '0 0 auto' }} />
                                <Typography sx={{ color: subText, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {channelLabel(r.id)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, pl: 1.4 }}>
                                <Typography sx={{ color: text, fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
                                    {fmtValue(r.value, channelPrecision(r.id))}
                                </Typography>
                                <Typography sx={{ color: subText, fontSize: '0.66rem', fontWeight: 700 }}>{unit}</Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Per-strip config dialog
// ---------------------------------------------------------------------------

function StripConfigDialog({ open, onClose, strip, stripIndex, onSave, channels, surface, border, text, subText }) {
    const [draft, setDraft] = useState(strip);
    useEffect(() => { if (open) setDraft(JSON.parse(JSON.stringify(strip))); }, [open, strip]);

    const updatePen = (pi, patch) => {
        setDraft(prev => ({
            ...prev,
            pens: prev.pens.map((p, i) => (i === pi ? { ...p, ...patch } : p))
        }));
    };
    const onChannel = (pi, channelId) => {
        const meta = METRIC_LOOKUP.get(channelId);
        updatePen(pi, {
            channelId,
            min: meta?.defaultMin ?? 0,
            max: meta?.defaultMax ?? 1
        });
    };
    const addPen = () => {
        setDraft(prev => ({
            ...prev,
            pens: [...prev.pens, normalizePen({ channelId: (channels && channels[0]) || ALL_METRIC_IDS[0] }, prev.pens.length)]
        }));
    };
    const removePen = (pi) => {
        setDraft(prev => ({ ...prev, pens: prev.pens.filter((_, i) => i !== pi) }));
    };

    const fieldSx = { '& .MuiInputBase-root': { color: text }, '& .MuiOutlinedInput-notchedOutline': { borderColor: border } };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: surface, color: text, border: `1px solid ${border}` } }}>
            <DialogTitle sx={{ fontWeight: 900, borderBottom: `1px solid ${border}`, fontSize: '1rem' }}>
                Configure “{strip.title}”
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: border }}>
                <TextField
                    label="Track title"
                    value={draft.title}
                    onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                    size="small"
                    fullWidth
                    sx={{ ...fieldSx, mb: 2 }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {draft.pens.map((pen, pi) => (
                        <Paper key={pi} sx={{ p: 1.25, bgcolor: 'transparent', border: `1px solid ${border}`, borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => updatePen(pi, { enabled: !pen.enabled })}
                                    sx={{ color: pen.enabled ? pen.color : subText }}
                                    title={pen.enabled ? 'Pen on' : 'Pen off'}
                                >
                                    <Box sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: pen.enabled ? pen.color : 'transparent', border: `2px solid ${pen.color}` }} />
                                </IconButton>
                                <FormControl size="small" fullWidth>
                                    <ChannelSelect
                                        value={pen.channelId}
                                        onChange={(v) => onChannel(pi, v)}
                                        channels={channels}
                                        sx={{ color: text, '& .MuiOutlinedInput-notchedOutline': { borderColor: border } }}
                                    />
                                </FormControl>
                                <IconButton size="small" onClick={() => removePen(pi)} sx={{ color: subText }} title="Remove pen">
                                    <Trash2 size={16} />
                                </IconButton>
                            </Box>
                            <Grid container spacing={1}>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Min" type="number" size="small" fullWidth sx={fieldSx}
                                        value={pen.min}
                                        onChange={(e) => updatePen(pi, { min: Number(e.target.value) })}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Max" type="number" size="small" fullWidth sx={fieldSx}
                                        value={pen.max}
                                        onChange={(e) => updatePen(pi, { max: Number(e.target.value) })}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Color" type="color" size="small" fullWidth
                                        sx={{ ...fieldSx, '& input': { height: 23, p: '4px' } }}
                                        value={COLOR_RE.test(pen.color) ? pen.color : '#38bdf8'}
                                        onChange={(e) => updatePen(pi, { color: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}
                </Box>
                <Button
                    startIcon={<Plus size={16} />}
                    onClick={addPen}
                    disabled={draft.pens.length >= MAX_PENS}
                    sx={{ mt: 1.5, color: text, borderColor: border }}
                    variant="outlined"
                    size="small"
                >
                    Add pen ({draft.pens.length}/{MAX_PENS})
                </Button>
            </DialogContent>
            <DialogActions sx={{ borderTop: `1px solid ${border}`, p: 1.5 }}>
                <Button onClick={onClose} sx={{ color: subText }}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={() => { onSave(stripIndex, normalizeStrips([draft])[0]); onClose(); }}
                >
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function CustomTimeDialog({ open, onClose, value, onApply, surface, border, text, subText, accent }) {
    const now = Date.now();
    const [draft, setDraft] = useState(() => ({
        start: toDateTimeLocal(value?.start || now - 60 * 60 * 1000),
        stop: toDateTimeLocal(value?.stop || now)
    }));

    useEffect(() => {
        if (!open) return;
        const freshNow = Date.now();
        setDraft({
            start: toDateTimeLocal(value?.start || freshNow - 60 * 60 * 1000),
            stop: toDateTimeLocal(value?.stop || freshNow)
        });
    }, [open, value]);

    const valid = new Date(draft.stop).getTime() > new Date(draft.start).getTime();
    const fieldSx = {
        '& .MuiInputBase-root': { color: text },
        '& .MuiInputLabel-root': { color: subText },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
        '& input': { colorScheme: 'dark' }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: surface, color: text, border: `1px solid ${border}` } }}>
            <DialogTitle sx={{ fontWeight: 900, borderBottom: `1px solid ${border}` }}>Custom Time Range</DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            size="small"
                            type="datetime-local"
                            label="From"
                            value={draft.start}
                            onChange={(e) => setDraft(prev => ({ ...prev, start: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            size="small"
                            type="datetime-local"
                            label="To"
                            value={draft.stop}
                            onChange={(e) => setDraft(prev => ({ ...prev, stop: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={fieldSx}
                        />
                    </Grid>
                </Grid>
                {!valid && (
                    <Typography sx={{ color: '#fb7185', fontSize: '0.78rem', mt: 1.5, fontWeight: 700 }}>
                        To time must be after From time.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ borderTop: `1px solid ${border}`, p: 1.5 }}>
                <Button onClick={onClose} sx={{ color: subText }}>Cancel</Button>
                <Button
                    variant="contained"
                    disabled={!valid}
                    onClick={() => {
                        onApply({
                            start: new Date(draft.start).getTime(),
                            stop: new Date(draft.stop).getTime()
                        });
                        onClose();
                    }}
                    sx={{ bgcolor: accent, fontWeight: 900 }}
                >
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function EdrExportDialog({ open, onClose, defaultMetrics, fetchRows, surface, border, text, subText, accent }) {
    const [format, setFormat] = useState('xlsx');
    const [selected, setSelected] = useState(() => new Set(defaultMetrics));
    const [range, setRange] = useState('-1h');
    const [custom, setCustom] = useState(() => ({
        start: toDateTimeLocal(Date.now() - 60 * 60 * 1000),
        stop: toDateTimeLocal(Date.now())
    }));
    const [useCustom, setUseCustom] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setSelected(new Set(defaultMetrics));
        setError('');
    }, [open, defaultMetrics]);

    const selectedMetrics = Array.from(selected);
    const toggleMetric = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const setAll = (enabled) => {
        setSelected(enabled ? new Set(METRIC_OPTIONS.map(o => o.id)) : new Set());
    };
    const fieldSx = {
        '& .MuiInputBase-root': { color: text, bgcolor: 'rgba(15,23,42,0.45)' },
        '& .MuiInputLabel-root': { color: subText },
        '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
        '& input': { colorScheme: 'dark' }
    };
    const activeRangeLabel = useCustom
        ? `${custom.start || 'from'} to ${custom.stop || 'to'}`
        : EXPORT_RANGES.find(r => r.key === range)?.label?.toLowerCase() || range;

    const runExport = async () => {
        if (!selectedMetrics.length) {
            setError('Select at least one parameter.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const historyRows = await fetchRows({
                metrics: selectedMetrics,
                range: useCustom ? null : range,
                start: useCustom ? fromDateTimeLocal(custom.start) : null,
                stop: useCustom ? fromDateTimeLocal(custom.stop) : null
            });
            if (!historyRows.length) throw new Error('No data found for selected range.');
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            if (format === 'png') {
                await exportRowsAsPng(historyRows, selectedMetrics, `edr-export-${stamp}.png`);
            } else {
                const rows = buildExportRows(historyRows, selectedMetrics);
                if (format === 'csv') exportRowsAsCsv(rows, `edr-export-${stamp}.csv`);
                else exportRowsAsXlsx(rows, `edr-export-${stamp}.xlsx`);
            }
        } catch (err) {
            setError(err?.message || 'Export failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { bgcolor: '#334155', color: text, border: `1px solid ${border}`, backgroundImage: 'none' } }}>
            <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${border}` }}>
                <Download size={26} color="#fbbf24" /> Export Data
                <IconButton onClick={onClose} sx={{ ml: 'auto', color: subText }}><X size={22} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5 }}>
                <Typography sx={{ color: subText, fontSize: '0.78rem', fontWeight: 900, letterSpacing: 2, mb: 1.25 }}>
                    EXPORT FORMAT
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.5, mb: 3 }}>
                    {[
                        { id: 'xlsx', label: 'EXCEL (.XLSX)', icon: <FileSpreadsheet size={20} /> },
                        { id: 'csv', label: 'CSV (.CSV)', icon: <FileText size={20} /> },
                        { id: 'png', label: 'GRAPH (.PNG)', icon: <ImageIcon size={20} /> }
                    ].map(opt => (
                        <Button
                            key={opt.id}
                            variant={format === opt.id ? 'contained' : 'outlined'}
                            onClick={() => setFormat(opt.id)}
                            startIcon={opt.icon}
                            sx={{
                                height: 56,
                                justifyContent: 'center',
                                fontWeight: 900,
                                color: format === opt.id ? '#061018' : text,
                                bgcolor: format === opt.id ? '#22c55e' : 'transparent',
                                borderColor: border,
                                '&:hover': { bgcolor: format === opt.id ? '#22c55e' : 'rgba(148,163,184,0.12)' }
                            }}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </Box>

                <Typography sx={{ color: subText, fontSize: '0.78rem', fontWeight: 900, letterSpacing: 2, mb: 1.25 }}>
                    SELECT PARAMETERS TO EXPORT
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
                    <Button size="small" onClick={() => setAll(true)} sx={{ bgcolor: 'rgba(148,163,184,0.16)', color: text, fontWeight: 800 }}>Select All</Button>
                    <Button size="small" onClick={() => setAll(false)} sx={{ bgcolor: 'rgba(148,163,184,0.16)', color: text, fontWeight: 800 }}>Deselect All</Button>
                </Box>
                <Box sx={{ maxHeight: 220, overflow: 'auto', bgcolor: '#1f2937', borderRadius: 1, border: `1px solid ${border}`, p: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.75 }}>
                    {METRIC_OPTIONS.map(metric => {
                        const checked = selected.has(metric.id);
                        return (
                            <Button
                                key={metric.id}
                                onClick={() => toggleMetric(metric.id)}
                                startIcon={<Checkbox checked={checked} sx={{ p: 0, color: subText, '&.Mui-checked': { color: '#fbbf24' } }} />}
                                sx={{
                                    justifyContent: 'flex-start',
                                    textTransform: 'none',
                                    color: checked ? '#fbbf24' : subText,
                                    border: `1px solid ${checked ? '#fbbf24' : 'transparent'}`,
                                    bgcolor: checked ? 'rgba(251,191,36,0.14)' : 'transparent',
                                    fontWeight: 800,
                                    overflow: 'hidden'
                                }}
                            >
                                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{metric.label}</Box>
                            </Button>
                        );
                    })}
                </Box>

                <Typography sx={{ color: subText, fontSize: '0.78rem', fontWeight: 900, letterSpacing: 2, mt: 3, mb: 1.25 }}>
                    QUICK SELECT
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
                    {EXPORT_RANGES.map(opt => (
                        <Button
                            key={opt.key}
                            onClick={() => { setRange(opt.key); setUseCustom(false); }}
                            variant={!useCustom && range === opt.key ? 'contained' : 'outlined'}
                            sx={{
                                minWidth: 138,
                                color: !useCustom && range === opt.key ? '#111827' : text,
                                bgcolor: !useCustom && range === opt.key ? '#fbbf24' : 'transparent',
                                borderColor: border,
                                fontWeight: 900
                            }}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </Box>

                <Typography sx={{ color: subText, fontSize: '0.78rem', fontWeight: 900, letterSpacing: 2, mb: 1.25 }}>
                    CUSTOM DATE RANGE
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="datetime-local"
                            label="From"
                            value={custom.start}
                            onFocus={() => setUseCustom(true)}
                            onChange={(e) => { setCustom(prev => ({ ...prev, start: e.target.value })); setUseCustom(true); }}
                            InputLabelProps={{ shrink: true }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="datetime-local"
                            label="To"
                            value={custom.stop}
                            onFocus={() => setUseCustom(true)}
                            onChange={(e) => { setCustom(prev => ({ ...prev, stop: e.target.value })); setUseCustom(true); }}
                            InputLabelProps={{ shrink: true }}
                            sx={fieldSx}
                        />
                    </Grid>
                </Grid>

                <Paper sx={{ mt: 2.5, p: 2, bgcolor: '#111827', color: text, border: `1px solid ${border}` }}>
                    <Typography sx={{ fontWeight: 700 }}>
                        Will export <Box component="span" sx={{ color: '#fbbf24', fontWeight: 900 }}>{activeRangeLabel}</Box> data for{' '}
                        <Box component="span" sx={{ color: accent, fontWeight: 900 }}>{selectedMetrics.length} selected parameters</Box>.
                    </Typography>
                    {error && <Typography sx={{ color: '#fb7185', mt: 1, fontWeight: 800 }}>{error}</Typography>}
                </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: `1px solid ${border}` }}>
                <Button onClick={onClose} sx={{ color: subText, fontWeight: 900 }}>Cancel</Button>
                <Button
                    onClick={runExport}
                    disabled={busy || selectedMetrics.length === 0}
                    startIcon={<Download size={18} />}
                    variant="contained"
                    sx={{ bgcolor: '#22c55e', color: '#061018', fontWeight: 900, minWidth: 180 }}
                >
                    {busy ? 'EXPORTING...' : `DOWNLOAD ${format.toUpperCase()}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// EdrView main
// ---------------------------------------------------------------------------

export function EdrView({
    mode = 'full',
    storageKey,
    defaultStrips = [],
    rightReadouts = [],
    channels = null
}) {
    const theme = useTheme();
    const isCompact = mode === 'compact';

    // Theme-derived tokens (work across all 4 themes).
    const isDark = theme.palette.mode === 'dark';
    const panelBg = theme.palette.background.paper;
    const chartBg = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.04)';
    const border = isDark ? 'rgba(148,163,184,0.28)' : 'rgba(15,23,42,0.18)';
    const gridColor = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.12)';
    const text = theme.palette.text.primary;
    const subText = theme.palette.text.secondary || (isDark ? '#94a3b8' : '#475569');
    const accent = theme.palette.primary.main;

    const initial = useMemo(() => loadPersisted(storageKey, defaultStrips, rightReadouts), [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
    const [strips, setStrips] = useState(initial.strips);
    const [indexMode, setIndexMode] = useState(initial.indexMode);
    // Configurable TOP readouts (full mode). Defaults to the rightReadouts prop.
    const [readouts, setReadouts] = useState(initial.readouts);

    const [timeWinIdx, setTimeWinIdx] = useState(isCompact ? 0 : 1);
    const [customTimeMinutes, setCustomTimeMinutes] = useState(DEFAULT_CUSTOM_TIME_MINUTES);
    const [customTimeRange, setCustomTimeRange] = useState(null);
    const [depthSpanIdx, setDepthSpanIdx] = useState(2);
    const [scrollOffset, setScrollOffset] = useState(0); // ms back in time, or m up in depth
    const [configStrip, setConfigStrip] = useState(null);
    const [customTimeOpen, setCustomTimeOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);

    const [data, setData] = useState([]); // [{ timestamp, depth, values:{channelId:value} }]
    const dragRef = useRef(null);

    // Persist strip config + index mode + readout selection (same storageKey).
    useEffect(() => {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify({ strips, indexMode, readouts }));
        } catch (e) { /* best effort */ }
    }, [storageKey, strips, indexMode, readouts]);

    // Set of channels we need to fetch (all pens + readouts + depth band).
    const neededChannels = useMemo(() => {
        const set = new Set([HOLE_DEPTH_METRIC, BIT_DEPTH_METRIC]);
        strips.forEach(s => s.pens.forEach(p => set.add(p.channelId)));
        if (!isCompact) readouts.forEach(id => set.add(id));
        return Array.from(set);
    }, [strips, readouts, isCompact]);

    const safeCustomMinutes = clampCustomMinutes(customTimeMinutes);
    const selectedTimeWindow = timeWinIdx === CUSTOM_TIME_KEY
        ? (customTimeRange?.start && customTimeRange?.stop
            ? {
                label: 'Custom',
                ms: Math.max(60 * 1000, customTimeRange.stop - customTimeRange.start),
                start: new Date(customTimeRange.start).toISOString(),
                stop: new Date(customTimeRange.stop).toISOString()
            }
            : {
                label: 'Custom',
                ms: safeCustomMinutes * 60 * 1000,
                range: `-${safeCustomMinutes}m`
            })
        : (TIME_WINDOWS[timeWinIdx] || TIME_WINDOWS[1] || TIME_WINDOWS[0]);
    const timeWindowMs = selectedTimeWindow.ms;
    const timeRange = selectedTimeWindow.range;

    // ---- History seed (time mode) ----
    const historyReq = useRef(0);
    const fetchHistory = useCallback(async () => {
        const reqId = ++historyReq.current;
        try {
            const params = new URLSearchParams();
            if (selectedTimeWindow.start && selectedTimeWindow.stop) {
                params.set('start', selectedTimeWindow.start);
                params.set('stop', selectedTimeWindow.stop);
            } else {
                params.set('range', timeRange);
            }
            params.set('metrics', neededChannels.join(','));
            const res = await axios.get(`/api/history?${params.toString()}`);
            if (reqId !== historyReq.current) return;
            const rows = Array.isArray(res.data) ? res.data : [];
            setData(rows.map(row => {
                const values = {};
                neededChannels.forEach(id => { values[id] = row[id]; });
                return {
                    timestamp: Number(row.timestamp),
                    depth: Number(row[DEPTH_INDEX_METRIC] ?? row['drilling.bit_depth']),
                    values
                };
            }).filter(r => Number.isFinite(r.timestamp)));
        } catch (err) {
            if (reqId !== historyReq.current) return;
            console.error('EdrView: failed to load history', err);
        }
    }, [neededChannels, selectedTimeWindow.start, selectedTimeWindow.stop, timeRange]);

    // ---- Live point ingestion (shared socket) ----
    const ingest = useCallback((payload) => {
        const tsStr = payload?._meta?.ts;
        const ts = tsStr ? new Date(tsStr).getTime() : Date.now();
        const values = {};
        Object.keys(payload || {}).forEach(measurement => {
            const block = payload[measurement];
            if (block && typeof block === 'object') {
                Object.keys(block).forEach(field => {
                    values[`${measurement}.${field}`] = block[field];
                });
            }
        });
        const depth = Number(values[DEPTH_INDEX_METRIC] ?? values['drilling.bit_depth']);
        setData(prev => {
            const point = { timestamp: ts, depth, values };
            const merged = [...prev, point];
            const bySecond = new Map();
            merged.forEach(p => {
                const key = Math.floor((p.timestamp || 0) / 1000);
                bySecond.set(key, p); // keep latest within a second
            });
            const sorted = Array.from(bySecond.values()).sort((a, b) => a.timestamp - b.timestamp);
            // Cap buffer to the largest time window + headroom for scrolling.
            const maxPresetWindowMs = TIME_WINDOWS[TIME_WINDOWS.length - 1].ms;
            const cutoff = ts - (Math.max(maxPresetWindowMs, timeWindowMs) * 1.5);
            return sorted.filter(p => (p.timestamp || 0) >= cutoff);
        });
    }, [timeWindowMs]);

    useEffect(() => {
        fetchHistory();
        axios.get('/api/rig/latest')
            .then(({ data: latest }) => {
                if (latest && Object.keys(latest).length) ingest(latest);
            })
            .catch(() => { /* non-fatal */ });
        const handler = (d) => ingest(d);
        socket.on('rig_data', handler);
        return () => socket.off('rig_data', handler);
    }, [fetchHistory, ingest]);

    // Reset scroll when switching index modes.
    useEffect(() => { setScrollOffset(0); }, [indexMode, timeWinIdx, customTimeMinutes, customTimeRange, depthSpanIdx]);

    // ---- Compute index domain + samples for the SVG ----
    const sorted = data; // already time-sorted

    const maxDepth = useMemo(() => sorted.reduce((m, p) => (
        Number.isFinite(p.depth) ? Math.max(m, p.depth) : m
    ), 0), [sorted]);

    const { indexDomain, samples } = useMemo(() => {
        if (indexMode === 'depth') {
            // Bin samples into depth buckets; keep last sample per bin.
            const bins = new Map();
            sorted.forEach(p => {
                if (!Number.isFinite(p.depth)) return;
                const key = Math.round(p.depth / DEPTH_BIN_M);
                bins.set(key, { depth: key * DEPTH_BIN_M, timestamp: p.timestamp, values: p.values });
            });
            const binned = Array.from(bins.values()).sort((a, b) => a.depth - b.depth);
            const span = DEPTH_SPANS[depthSpanIdx]?.m ?? 100;
            // Bottom of window = deepest minus scroll; depth increases downward.
            const bottom = Math.max(span, maxDepth - scrollOffset);
            const top = bottom - span;
            return { indexDomain: [top, bottom], samples: binned };
        }
        // Time mode: newest at the BOTTOM.
        const now = customTimeRange?.stop && timeWinIdx === CUSTOM_TIME_KEY
            ? customTimeRange.stop
            : (sorted.length ? sorted[sorted.length - 1].timestamp : Date.now());
        const bottom = now - scrollOffset;
        const top = bottom - timeWindowMs;
        return { indexDomain: [top, bottom], samples: sorted };
    }, [indexMode, sorted, depthSpanIdx, maxDepth, scrollOffset, timeWindowMs]);

    const latestValues = useMemo(() => (sorted.length ? sorted[sorted.length - 1].values : {}), [sorted]);

    // ---- Index axis ticks ----
    const axisTicks = useMemo(() => {
        const [a, b] = indexDomain;
        const count = 6;
        return Array.from({ length: count + 1 }, (_, i) => {
            const frac = i / count;
            const v = a + frac * (b - a);
            const labelFrac = Math.min(0.96, Math.max(0.075, frac));
            const label = indexMode === 'depth'
                ? `${Math.round(v)}`
                : formatAxisTime(v, b - a);
            return { frac, labelFrac, label };
        });
    }, [indexDomain, indexMode]);

    // ---- Scroll handlers ----
    // One "page" of the visible window; a single rail click moves a half-window.
    const windowLen = indexMode === 'depth'
        ? (DEPTH_SPANS[depthSpanIdx]?.m ?? 100)
        : timeWindowMs;
    const scrollStep = windowLen * 0.5;            // single rail click = half window
    // Smaller increments for continuous (wheel / press-and-hold) scrolling so the
    // motion is smooth rather than jumpy.
    const wheelStep = windowLen * 0.12;            // per wheel notch
    const holdStep = windowLen * 0.06;             // per rAF tick while a button is held

    // Clamp helper: offset can never go below 0 — that is the live edge, so we
    // never scroll into the future. (Scrolling back is bounded by the buffer.)
    const clampOffset = useCallback((next) => Math.max(0, next), []);

    const scrollByAmount = useCallback((delta) => {
        // delta > 0 = back into history (older/shallower); < 0 = toward live.
        setScrollOffset(o => clampOffset(o + delta));
    }, [clampOffset]);

    const scrollBack = useCallback(() => scrollByAmount(scrollStep), [scrollByAmount, scrollStep]);   // older / shallower
    const scrollFwd = useCallback(() => scrollByAmount(-scrollStep), [scrollByAmount, scrollStep]);    // newer / deeper

    // --- Mouse-wheel continuous scroll (non-passive so we can preventDefault) ---
    const stripAreaRef = useRef(null);
    const wheelStepRef = useRef(wheelStep);
    wheelStepRef.current = wheelStep;
    useEffect(() => {
        const el = stripAreaRef.current;
        if (!el) return undefined;
        const onWheel = (e) => {
            // Block the page from scrolling while the pointer is over the strips.
            e.preventDefault();
            // wheel up (deltaY < 0) => back into history; wheel down => toward live.
            const dir = e.deltaY < 0 ? 1 : -1;
            setScrollOffset(o => clampOffset(o + dir * wheelStepRef.current));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [clampOffset]);

    // --- Press-and-hold continuous scroll on the rail buttons ---
    // While held, repeat a small step each animation frame; a plain click still
    // performs exactly one half-window step (handled by the rail's onClick).
    const holdRafRef = useRef(0);
    const heldMovedRef = useRef(false); // did the hold actually scroll continuously?
    const holdStepRef = useRef(holdStep);
    holdStepRef.current = holdStep;
    const startHold = useCallback((dir) => {
        if (holdRafRef.current) return;
        heldMovedRef.current = false;
        let frames = 0;
        const tick = () => {
            frames += 1;
            // brief grace period so a quick click is handled solely by onClick
            if (frames > 12) {
                heldMovedRef.current = true;
                setScrollOffset(o => clampOffset(o + dir * holdStepRef.current));
            }
            holdRafRef.current = requestAnimationFrame(tick);
        };
        holdRafRef.current = requestAnimationFrame(tick);
    }, [clampOffset]);
    const stopHold = useCallback(() => {
        if (holdRafRef.current) { cancelAnimationFrame(holdRafRef.current); holdRafRef.current = 0; }
    }, []);
    useEffect(() => () => { if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current); }, []);

    // Rail click = one step, BUT swallow the click that ends a press-and-hold so
    // releasing after a continuous scroll doesn't tack on an extra half-window jump.
    const clickBack = useCallback(() => {
        if (heldMovedRef.current) { heldMovedRef.current = false; return; }
        scrollBack();
    }, [scrollBack]);
    const clickFwd = useCallback(() => {
        if (heldMovedRef.current) { heldMovedRef.current = false; return; }
        scrollFwd();
    }, [scrollFwd]);

    // Drag on the axis to scroll.
    const onAxisPointerDown = (e) => {
        dragRef.current = { y: e.clientY, offset: scrollOffset };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const onAxisPointerMove = (e) => {
        if (!dragRef.current) return;
        const dy = e.clientY - dragRef.current.y;
        const el = e.currentTarget;
        const pxH = el.clientHeight || 1;
        const [a, b] = indexDomain;
        const perPx = (b - a) / pxH;
        // dragging DOWN reveals older data (increase offset)
        const next = dragRef.current.offset + dy * perPx;
        setScrollOffset(Math.max(0, next));
    };
    const onAxisPointerUp = () => { dragRef.current = null; };

    const updateStrip = useCallback((index, nextStrip) => {
        setStrips(prev => prev.map((s, i) => (i === index ? nextStrip : s)));
    }, []);

    const defaultExportMetrics = useMemo(() => {
        const ids = new Set([HOLE_DEPTH_METRIC, BIT_DEPTH_METRIC]);
        strips.forEach(strip => strip.pens.forEach(pen => ids.add(pen.channelId)));
        readouts.forEach(id => ids.add(id));
        return Array.from(ids).filter(id => METRIC_LOOKUP.has(id));
    }, [strips, readouts]);

    const fetchExportRows = useCallback(async ({ metrics, range, start, stop }) => {
        const params = new URLSearchParams();
        if (start && stop) {
            params.set('start', start);
            params.set('stop', stop);
        } else {
            params.set('range', range || '-1h');
        }
        params.set('metrics', metrics.join(','));
        const res = await axios.get(`/api/history?${params.toString()}`);
        return Array.isArray(res.data) ? res.data : [];
    }, []);

    const liveAtBottom = scrollOffset <= (indexMode === 'depth' ? 0.01 : 1000);
    const jumpToLive = useCallback(() => setScrollOffset(0), []);

    // ---------------- Render ----------------

    const axisWidth = isCompact ? 44 : 56;
    const bottomH = isCompact ? 64 : 96;          // fixed variables-block height
    const headerH = isCompact ? 22 : 26;          // per-strip header row height
    // Top/bottom offsets so the index axis, scroll rails and left depth band line
    // up with the chart area: top offset = strip header height, bottom = variables block.
    const railTop = headerH + 4;
    const railBottom = bottomH + 4;
    const showLeftDepth = !isCompact;
    const showTopReadouts = !isCompact && readouts.length > 0;

    const holeDepthVal = latestValues?.[HOLE_DEPTH_METRIC];
    const bitDepthVal = latestValues?.[BIT_DEPTH_METRIC];

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={indexMode}
                    onChange={(_, v) => v && setIndexMode(v)}
                    sx={{
                        '& .MuiToggleButton-root': { color: subText, borderColor: border, px: 1.25, py: 0.4, textTransform: 'none', fontWeight: 800 },
                        '& .Mui-selected': { color: `${accent} !important`, bgcolor: `${accent}22 !important` }
                    }}
                >
                    <ToggleButton value="time"><Clock size={15} style={{ marginRight: 6 }} /> Time</ToggleButton>
                    <ToggleButton value="depth"><Ruler size={15} style={{ marginRight: 6 }} /> Depth</ToggleButton>
                </ToggleButtonGroup>

                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                    {(indexMode === 'time' ? TIME_WINDOWS : DEPTH_SPANS).map((opt, i) => {
                        const active = indexMode === 'time' ? i === timeWinIdx : i === depthSpanIdx;
                        return (
                            <Button
                                key={opt.label}
                                size="small"
                                onClick={() => (indexMode === 'time' ? setTimeWinIdx(i) : setDepthSpanIdx(i))}
                                sx={{
                                    minWidth: 36, px: 0.75, textTransform: 'none', fontWeight: 800,
                                    color: active ? theme.palette.getContrastText(accent) : subText,
                                    bgcolor: active ? accent : 'transparent',
                                    border: `1px solid ${border}`,
                                    '&:hover': { bgcolor: active ? accent : `${accent}18` }
                                }}
                            >
                                {opt.label}
                            </Button>
                        );
                    })}
                    {indexMode === 'time' && (
                        <Button
                            size="small"
                            startIcon={<Clock size={14} />}
                            onClick={() => setCustomTimeOpen(true)}
                            sx={{
                                minWidth: 82, px: 1, textTransform: 'none', fontWeight: 900,
                                color: timeWinIdx === CUSTOM_TIME_KEY ? theme.palette.getContrastText(accent) : subText,
                                bgcolor: timeWinIdx === CUSTOM_TIME_KEY ? accent : 'transparent',
                                border: `1px solid ${border}`,
                                '&:hover': { bgcolor: timeWinIdx === CUSTOM_TIME_KEY ? accent : `${accent}18` }
                            }}
                        >
                            Custom
                        </Button>
                    )}
                </Box>

                <Box sx={{ flex: 1 }} />

                {/* LIVE indicator + jump-to-live affordance. Scrolling lives on the side rails. */}
                {liveAtBottom ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <Radio size={13} color="#22c55e" />
                        <Typography sx={{ color: '#22c55e', fontSize: '0.72rem', fontWeight: 900, letterSpacing: 0.5 }}>LIVE</Typography>
                    </Box>
                ) : (
                    <MuiTooltip title="Jump to live">
                        <Button
                            size="small"
                            onClick={jumpToLive}
                            startIcon={<Radio size={13} />}
                            sx={{
                                textTransform: 'none', fontWeight: 800, py: 0.2, px: 1,
                                color: subText, border: `1px solid ${border}`,
                                '&:hover': { color: '#22c55e', borderColor: '#22c55e' }
                            }}
                        >
                            {indexMode === 'depth'
                                ? `${Math.round(indexDomain[0])}–${Math.round(indexDomain[1])} m · live`
                                : 'Scrolled back · live'}
                        </Button>
                    </MuiTooltip>
                )}
                {!isCompact && (
                    <Button
                        size="small"
                        startIcon={<Download size={15} />}
                        onClick={() => setExportOpen(true)}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 900,
                            color: text,
                            border: `1px solid ${border}`,
                            py: 0.35,
                            '&:hover': { borderColor: accent, color: accent }
                        }}
                    >
                        Export
                    </Button>
                )}
            </Box>

            {/* Top band (full mode): left depth tiles spacer + configurable readout row. */}
            {showTopReadouts && (
                <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0.75, mb: 1 }}>
                    {showLeftDepth && (
                        /* Spacer aligning the top readout row with the strips column:
                           depth track (132) + gap + left scroll rail (~30) + gap. */
                        <Box sx={{ flex: '0 0 176px', display: 'flex', alignItems: 'center', gap: 0.6, pl: 0.5 }}>
                            <Gauge size={16} color={subText} />
                            <Typography sx={{ color: subText, fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Depth
                            </Typography>
                        </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', gap: 0.75, overflowX: 'auto' }}>
                        {readouts.map((id) => (
                            <ReadoutTile
                                key={id}
                                id={id}
                                value={latestValues?.[id]}
                                surface={panelBg}
                                border={border}
                                text={text}
                                subText={subText}
                                accent={accent}
                            />
                        ))}
                    </Box>
                    <Box sx={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                        <ReadoutsConfig
                            value={readouts}
                            onChange={setReadouts}
                            channels={channels}
                            surface={panelBg}
                            border={border}
                            text={text}
                            subText={subText}
                            accent={accent}
                        />
                    </Box>
                </Box>
            )}
            {/* When no readouts selected, still expose the config control (full mode). */}
            {!isCompact && readouts.length === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <ReadoutsConfig
                        value={readouts}
                        onChange={setReadouts}
                        channels={channels}
                        surface={panelBg}
                        border={border}
                        text={text}
                        subText={subText}
                        accent={accent}
                    />
                </Box>
            )}

            {/* Strip area */}
            <Box ref={stripAreaRef} sx={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 0.75 }}>
                {/* Leftmost DEPTH track (full mode): header + depth-axis chart band + HOLE/BIT
                    depth bottom block, all sharing the strips' row metrics so it aligns exactly.
                    The depth/time axis is folded into this track's chart band. */}
                {showLeftDepth ? (
                    <DepthTrack
                        indexMode={indexMode}
                        indexDomain={indexDomain}
                        axisTicks={axisTicks}
                        samples={samples}
                        maxDepth={maxDepth}
                        holeDepthVal={holeDepthVal}
                        bitDepthVal={bitDepthVal}
                        headerH={headerH}
                        bottomH={bottomH}
                        chartBg={chartBg}
                        panelBg={panelBg}
                        border={border}
                        gridColor={gridColor}
                        text={text}
                        subText={subText}
                        accent={accent}
                        onPointerDown={onAxisPointerDown}
                        onPointerMove={onAxisPointerMove}
                        onPointerUp={onAxisPointerUp}
                    />
                ) : (
                    /* Compact mode: keep the slim standalone index axis (no depth track). */
                    <Box
                        onPointerDown={onAxisPointerDown}
                        onPointerMove={onAxisPointerMove}
                        onPointerUp={onAxisPointerUp}
                        onPointerLeave={onAxisPointerUp}
                        sx={{
                            flex: `0 0 ${axisWidth}px`,
                            bgcolor: panelBg,
                            border: `1px solid ${border}`,
                            borderRadius: 1,
                            position: 'relative',
                            cursor: 'ns-resize',
                            userSelect: 'none',
                            touchAction: 'none',
                            mt: `${railTop}px`,
                            mb: `${railBottom}px`
                        }}
                    >
                        <Typography sx={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center', fontSize: '0.6rem', fontWeight: 800, color: subText, textTransform: 'uppercase' }}>
                            {indexMode === 'depth' ? 'm' : 'time'}
                        </Typography>
                        {axisTicks.map((t, i) => (
                            <Box key={i} sx={{ position: 'absolute', left: 0, right: 0, top: `${(t.labelFrac ?? t.frac) * 100}%`, transform: 'translateY(-50%)', px: 0.25 }}>
                                <Typography sx={{ fontSize: '0.55rem', color: subText, textAlign: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                    {t.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* LEFT scroll rail */}
                <ScrollRail
                    onUp={clickBack}
                    onDown={clickFwd}
                    onHoldUp={() => startHold(1)}
                    onHoldDown={() => startHold(-1)}
                    onHoldStop={stopHold}
                    upTip={indexMode === 'depth' ? 'Shallower' : 'Older'}
                    downTip={indexMode === 'depth' ? 'Deeper' : 'Newer'}
                    downDisabled={liveAtBottom}
                    text={text}
                    border={border}
                    top={railTop}
                    bottom={railBottom}
                />

                {/* Strips */}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 0.75 }}>
                    {strips.map((strip, si) => (
                        <Box key={si} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {/* header */}
                            <Box sx={{ height: headerH, display: 'flex', alignItems: 'center', gap: 0.5, mb: '4px' }}>
                                <Typography sx={{ flex: 1, minWidth: 0, color: text, fontSize: isCompact ? '0.66rem' : '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {strip.title}
                                </Typography>
                                <IconButton size="small" onClick={() => setConfigStrip(si)} sx={{ color: subText, p: 0.25 }} title="Configure track">
                                    <Settings size={isCompact ? 13 : 15} />
                                </IconButton>
                            </Box>
                            {/* chart */}
                            <Box sx={{ flex: '1 1 auto', minHeight: 0, bgcolor: chartBg, border: `1px solid ${border}`, borderRadius: 1, overflow: 'hidden' }}>
                                <StripChart
                                    strip={strip}
                                    samples={samples}
                                    indexMode={indexMode}
                                    indexDomain={indexDomain}
                                    accentColor={accent}
                                    gridColor={gridColor}
                                    axisTextColor={subText}
                                    surface={panelBg}
                                    border={border}
                                    subText={subText}
                                    textColor={text}
                                />
                            </Box>
                            {/* fixed-height variables block */}
                            <StripVariables
                                strip={strip}
                                latest={latestValues}
                                compact={isCompact}
                                surface={panelBg}
                                border={border}
                                subText={subText}
                            />
                        </Box>
                    ))}
                </Box>

                {/* RIGHT scroll rail (mirror of the left) — full mode only; compact keeps a single control. */}
                {!isCompact && (
                    <ScrollRail
                        onUp={clickBack}
                        onDown={clickFwd}
                        onHoldUp={() => startHold(1)}
                        onHoldDown={() => startHold(-1)}
                        onHoldStop={stopHold}
                        upTip={indexMode === 'depth' ? 'Shallower' : 'Older'}
                        downTip={indexMode === 'depth' ? 'Deeper' : 'Newer'}
                        downDisabled={liveAtBottom}
                        text={text}
                        border={border}
                        top={railTop}
                        bottom={railBottom}
                    />
                )}
            </Box>

            {/* Per-strip config dialog */}
            {configStrip != null && (
                <StripConfigDialog
                    open={configStrip != null}
                    onClose={() => setConfigStrip(null)}
                    strip={strips[configStrip]}
                    stripIndex={configStrip}
                    onSave={updateStrip}
                    channels={channels}
                    surface={panelBg}
                    border={border}
                    text={text}
                    subText={subText}
                />
            )}
            {customTimeOpen && (
                <CustomTimeDialog
                    open={customTimeOpen}
                    onClose={() => setCustomTimeOpen(false)}
                    value={customTimeRange}
                    onApply={(range) => {
                        setCustomTimeRange(range);
                        setTimeWinIdx(CUSTOM_TIME_KEY);
                        setIndexMode('time');
                    }}
                    surface={panelBg}
                    border={border}
                    text={text}
                    subText={subText}
                    accent={accent}
                />
            )}
            {exportOpen && (
                <EdrExportDialog
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    defaultMetrics={defaultExportMetrics}
                    fetchRows={fetchExportRows}
                    surface={panelBg}
                    border={border}
                    text={text}
                    subText={subText}
                    accent={accent}
                />
            )}
        </Box>
    );
}


// ---------------------------------------------------------------------------
// One-file standalone EDR page
// ---------------------------------------------------------------------------

const DEFAULT_STRIPS = [
    {
        title: 'Hookload / WOB',
        pens: [
            { channelId: 'drilling.wob', color: '#38bdf8', min: 0, max: 100, enabled: true },
            { channelId: 'drawworks.hook_load', color: '#fbbf24', min: 0, max: 500, enabled: true },
            { channelId: 'drawworks.block_position', color: '#4ade80', min: 0, max: 50, enabled: true }
        ]
    },
    {
        title: 'Rotary',
        pens: [
            { channelId: 'drilling.rpm', color: '#a78bfa', min: 0, max: 250, enabled: true },
            { channelId: 'drilling.rop', color: '#f472b6', min: 0, max: 80, enabled: true },
            { channelId: 'drilling.torque', color: '#22d3ee', min: 0, max: 20000, enabled: true }
        ]
    },
    {
        title: 'Pump',
        pens: [
            { channelId: 'mudpump.spm', color: '#fb7185', min: 0, max: 200, enabled: true },
            { channelId: 'mudpump.pressure', color: '#38bdf8', min: 0, max: 500, enabled: true },
            { channelId: 'mudpump.flow_in', color: '#f97316', min: 0, max: 3000, enabled: true }
        ]
    },
    {
        title: 'Mud Volumes',
        pens: [
            { channelId: 'fluid.total_tank_volume', color: '#4ade80', min: 0, max: 500, enabled: true },
            { channelId: 'fluid.tank_gain_loss', color: '#fbbf24', min: -50, max: 50, enabled: true },
            { channelId: 'fluid.trip_tank', color: '#a78bfa', min: 0, max: 50, enabled: true }
        ]
    }
];

const TOP_READOUTS = [
    'mudpump.pressure',
    'mudpump.spm',
    'drilling.rop',
    'drawworks.hook_load'
];

export default function EdrStandalonePage() {
    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                <Activity size={22} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    Electronic Drilling Recorder (EDR)
                </Typography>
                <Chip
                    size="small"
                    label="Strip-chart log"
                    sx={{ fontWeight: 800 }}
                    color="primary"
                    variant="outlined"
                />
            </Box>
            <Box sx={{ flex: '1 1 auto', minHeight: 0 }}>
                <EdrView
                    mode="full"
                    storageKey="edr-main"
                    defaultStrips={DEFAULT_STRIPS}
                    rightReadouts={TOP_READOUTS}
                />
            </Box>
        </Box>
    );
}
