import React, { useState, useEffect } from 'react';
import {
  fetchScenariosApi,
  createScenarioApi,
  fetchFacilities
} from '../../services/api';

export default function ScenarioSimulatorPage() {
  const [scenarios, setScenarios] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const [activeSimulation, setActiveSimulation] = useState(null);

  // Form State
  const [facilityId, setFacilityId] = useState('');
  const [scenarioName, setScenarioName] = useState('Off-Peak Load Shifting Simulation');
  const [scenarioType, setScenarioType] = useState('load_shift');
  const [params, setParams] = useState({
    shift_percentage: 15,
    reduction_percentage: 10,
    solar_kw: 250,
    battery_kwh: 500
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [facRes, scRes] = await Promise.all([
        fetchFacilities(),
        fetchScenariosApi()
      ]);
      setFacilities(facRes || []);
      if (facRes && facRes.length > 0) {
        setFacilityId(facRes[0].id);
      }
      setScenarios(scRes || []);
      if (scRes && scRes.length > 0) {
        setActiveSimulation(scRes[0]);
      }
    } catch (err) {
      console.error("Error loading scenarios:", err);
      setError("Failed to load scenario simulations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunSimulation(e) {
    e.preventDefault();
    if (!facilityId) {
      alert("Please select a facility for baseline simulation.");
      return;
    }
    setRunning(true);
    try {
      let scenarioParams = {};
      if (scenarioType === 'load_shift') scenarioParams = { shift_percentage: parseFloat(params.shift_percentage) };
      else if (scenarioType === 'demand_reduction') scenarioParams = { reduction_percentage: parseFloat(params.reduction_percentage) };
      else if (scenarioType === 'add_solar') scenarioParams = { solar_kw: parseFloat(params.solar_kw) };
      else if (scenarioType === 'add_battery') scenarioParams = { battery_kwh: parseFloat(params.battery_kwh) };

      const payload = {
        facility: facilityId,
        name: scenarioName || `${scenarioType.replace('_', ' ').toUpperCase()} Simulation`,
        scenario_type: scenarioType,
        parameters: scenarioParams
      };

      const result = await createScenarioApi(payload);
      setActiveSimulation(result);
      loadData();
    } catch (err) {
      alert("Failed to execute scenario simulation: " + (err.message || 'Unknown error'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Energy Scenario Simulator
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Model peak shaving, load shifting, solar rooftop integration, and BESS storage impact before deployment.
        </p>
      </div>

      {/* Simulator Control Panel Form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Configure New Simulation Scenario
        </h2>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Target Facility *</label>
            <select
              required
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Scenario Type *</label>
            <select
              value={scenarioType}
              onChange={(e) => {
                setScenarioType(e.target.value);
                if (e.target.value === 'load_shift') setScenarioName('15% Off-Peak Load Shifting Simulation');
                else if (e.target.value === 'demand_reduction') setScenarioName('10% Peak Demand Reduction');
                else if (e.target.value === 'add_solar') setScenarioName('250 kW Rooftop Solar Addition');
                else if (e.target.value === 'add_battery') setScenarioName('500 kWh BESS Battery Storage Shaving');
              }}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
            >
              <option value="load_shift">TOU Load Shifting</option>
              <option value="demand_reduction">Facility Demand Shaving</option>
              <option value="add_solar">Hypothetical Solar PV Addition</option>
              <option value="add_battery">Hypothetical BESS Storage Addition</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              {scenarioType === 'load_shift' && 'Shift Percentage (%)'}
              {scenarioType === 'demand_reduction' && 'Reduction Percentage (%)'}
              {scenarioType === 'add_solar' && 'Solar Capacity (kW)'}
              {scenarioType === 'add_battery' && 'Battery Capacity (kWh)'}
            </label>
            <input
              type="number"
              step="any"
              required
              value={
                scenarioType === 'load_shift' ? params.shift_percentage :
                scenarioType === 'demand_reduction' ? params.reduction_percentage :
                scenarioType === 'add_solar' ? params.solar_kw :
                params.battery_kwh
              }
              onChange={(e) => {
                const val = e.target.value;
                if (scenarioType === 'load_shift') setParams({ ...params, shift_percentage: val });
                else if (scenarioType === 'demand_reduction') setParams({ ...params, reduction_percentage: val });
                else if (scenarioType === 'add_solar') setParams({ ...params, solar_kw: val });
                else setParams({ ...params, battery_kwh: val });
              }}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-4 flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="submit"
              disabled={running}
              className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50"
            >
              {running ? 'Executing Simulation Engine...' : '⚡ Run Simulation Engine'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Simulation Results Display */}
      {activeSimulation && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 uppercase tracking-wider mb-1">
                <span>⚠️ SIMULATED RESULT</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{activeSimulation.name}</h2>
              <p className="text-xs text-gray-500">Facility: {activeSimulation.facility_name} | Type: {activeSimulation.scenario_type}</p>
            </div>
            <div className="text-right text-xs">
              <span className="text-gray-400 block">Baseline Period</span>
              <span className="font-semibold text-gray-900 dark:text-white">Prior 30 Days Telemetry</span>
            </div>
          </div>

          {/* Results Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Estimated Cost Savings</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ₹{Number(activeSimulation.cost_savings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-gray-500">
                Baseline Cost: ₹{Number(activeSimulation.baseline_cost || 0).toLocaleString()} → Simulated: ₹{Number(activeSimulation.simulated_cost || 0).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Peak Demand Reduction</span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeSimulation.demand_savings_kw || 0} kW
              </div>
              <p className="text-[11px] text-gray-500">
                Baseline Peak: {activeSimulation.baseline_peak_kw} kW → Simulated: {activeSimulation.simulated_peak_kw} kW
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Energy Savings</span>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Number(activeSimulation.kwh_savings || 0).toLocaleString()} kWh
              </div>
              <p className="text-[11px] text-gray-500">
                Baseline kWh: {Number(activeSimulation.baseline_kwh || 0).toLocaleString()} → Simulated: {Number(activeSimulation.simulated_kwh || 0).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Simulation Parameters</span>
              <div className="text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200">
                {JSON.stringify(activeSimulation.parameters)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Simulations Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Saved Scenario Runs ({scenarios.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading saved scenarios...</div>
        ) : scenarios.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">No scenario simulations executed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 uppercase text-gray-500 font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Scenario Name</th>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Cost Savings</th>
                  <th className="px-4 py-3">Demand Savings</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {scenarios.map(sc => (
                  <tr key={sc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">{sc.name}</td>
                    <td className="px-4 py-3.5">{sc.facility_name}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                        {sc.scenario_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(sc.cost_savings || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-blue-600 font-semibold">{sc.demand_savings_kw || 0} kW</td>
                    <td className="px-4 py-3.5 text-gray-400">{new Date(sc.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setActiveSimulation(sc)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Inspect Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
