import React, { useState, useEffect } from 'react';
import {
  fetchDevicesApi,
  createDeviceApi,
  checkDeviceHealthApi,
  fetchStorageAssetsApi,
  fetchFacilities
} from '../../services/api';

export default function DeviceManagementPage() {
  const [devices, setDevices] = useState([]);
  const [storageAssets, setStorageAssets] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFacility, setSelectedFacility] = useState('all');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' or 'storage'

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    facility: '',
    protocol: 'MODBUS_TCP',
    host_address: '192.168.1.100',
    port: 502,
    serial_number: '',
    manufacturer: 'Schneider Electric',
    model: 'PM8000'
  });
  const [saving, setSaving] = useState(false);
  const [healthModalData, setHealthModalData] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedFacility, protocolFilter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [facRes, devRes, storageRes] = await Promise.all([
        fetchFacilities(),
        fetchDevicesApi(selectedFacility, protocolFilter),
        fetchStorageAssetsApi()
      ]);
      setFacilities(facRes || []);
      setDevices(devRes || []);
      setStorageAssets(storageRes || []);
    } catch (err) {
      console.error("Error loading device management data:", err);
      setError("Failed to load device telemetry registry.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDevice(e) {
    e.preventDefault();
    if (!newDevice.name || !newDevice.facility) {
      alert("Please provide device name and select a facility.");
      return;
    }
    setSaving(true);
    try {
      await createDeviceApi(newDevice);
      setIsAddModalOpen(false);
      setNewDevice({
        name: '',
        facility: facilities[0]?.id || '',
        protocol: 'MODBUS_TCP',
        host_address: '192.168.1.100',
        port: 502,
        serial_number: '',
        manufacturer: 'Schneider Electric',
        model: 'PM8000'
      });
      loadData();
    } catch (err) {
      alert("Failed to register device: " + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRunHealthCheck(devId) {
    try {
      const res = await checkDeviceHealthApi(devId);
      setHealthModalData(res);
    } catch (err) {
      alert("Failed to fetch device health metrics: " + err.message);
    }
  }

  const filteredDevices = devices.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = devices.filter(d => d.connection_status === 'online').length;
  const offlineCount = devices.filter(d => d.connection_status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Device Registry & Industrial Protocols
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Modbus TCP/RTU, BACnet/IP, MQTT Gateway Telemetry & Battery Storage Assets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (facilities.length > 0 && !newDevice.facility) {
                setNewDevice(prev => ({ ...prev, facility: facilities[0].id }));
              }
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
          >
            + Register Device
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Registered Devices</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{devices.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Industrial Gateways & Meters</div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Online Status</div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{onlineCount} / {devices.length}</div>
          <div className="text-xs text-emerald-500 mt-1">Active Polling Telemetry</div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Offline / Stale Warnings</div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{offlineCount}</div>
          <div className="text-xs text-amber-500 mt-1">Gaps or Protocol Errors</div>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">BESS Storage Assets</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{storageAssets.length}</div>
          <div className="text-xs text-blue-500 mt-1">Battery Storage Subsystems</div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2 border-b sm:border-b-0 border-gray-200 dark:border-gray-800 pb-2 sm:pb-0">
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === 'devices'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            IoT & Field Devices ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === 'storage'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            BESS Storage Assets ({storageAssets.length})
          </button>
        </div>

        {activeTab === 'devices' && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search serial / model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Protocols</option>
              <option value="MODBUS_TCP">Modbus TCP</option>
              <option value="BACNET_IP">BACnet/IP</option>
              <option value="MQTT">MQTT</option>
              <option value="SIMULATOR">Simulator</option>
            </select>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Facilities</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading device registry...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900 text-sm">
          {error}
        </div>
      ) : activeTab === 'devices' ? (
        filteredDevices.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No Industrial Devices Registered</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Register field gateways, Modbus/BACnet meters, or MQTT adapters.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 uppercase text-gray-500 font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Device Name</th>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Manufacturer / Model</th>
                  <th className="px-4 py-3">Serial / ID</th>
                  <th className="px-4 py-3">Connection</th>
                  <th className="px-4 py-3">Last Telemetry</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {filteredDevices.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">
                      {d.name}
                    </td>
                    <td className="px-4 py-3.5">{d.facility_name || 'N/A'}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded font-mono font-medium text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                        {d.protocol}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{d.manufacturer} - {d.model}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">{d.serial_number || 'N/A'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                        d.connection_status === 'online' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${d.connection_status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {d.connection_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">
                      {d.last_seen ? new Date(d.last_seen).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleRunHealthCheck(d.id)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        Check Health
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Storage Assets View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storageAssets.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500">
              No Battery Storage (BESS) assets configured.
            </div>
          ) : (
            storageAssets.map(asset => (
              <div key={asset.id} className="p-5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{asset.name}</h3>
                    <p className="text-xs text-gray-500">{asset.facility_name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    asset.operating_status === 'DISCHARGING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' :
                    asset.operating_status === 'CHARGING' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {asset.operating_status}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-600 dark:text-gray-400">State of Charge (SOC)</span>
                    <span className="text-emerald-600 font-bold">{asset.current_soc_percent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, asset.current_soc_percent))}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <span className="text-gray-400 block">Rated Capacity:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{asset.capacity_kwh} kWh</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Max Discharge:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{asset.max_discharge_kw} kW</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Min / Max SOC:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{asset.min_soc_percent}% - {asset.max_soc_percent}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Roundtrip Efficiency:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{asset.efficiency_percent}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Register New Industrial Gateway / Device</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Device Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Substation Meter Gateway"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Facility *</label>
                <select
                  required
                  value={newDevice.facility}
                  onChange={(e) => setNewDevice({ ...newDevice, facility: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select Facility</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Protocol *</label>
                  <select
                    value={newDevice.protocol}
                    onChange={(e) => setNewDevice({ ...newDevice, protocol: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="MODBUS_TCP">Modbus TCP</option>
                    <option value="BACNET_IP">BACnet/IP</option>
                    <option value="MQTT">MQTT</option>
                    <option value="SIMULATOR">Simulator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                  <input
                    type="number"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({ ...newDevice, port: parseInt(e.target.value) || 502 })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Host / IP Address</label>
                <input
                  type="text"
                  placeholder="192.168.1.100"
                  value={newDevice.host_address}
                  onChange={(e) => setNewDevice({ ...newDevice, host_address: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={newDevice.manufacturer}
                    onChange={(e) => setNewDevice({ ...newDevice, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                  <input
                    type="text"
                    value={newDevice.model}
                    onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Registering...' : 'Save Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health Check Modal */}
      {healthModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white">Device Diagnostics & Health Report</h3>
              <button onClick={() => setHealthModalData(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded bg-gray-50 dark:bg-gray-800/60">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{healthModalData.device_name}</span>
                <span className="font-mono text-emerald-600 font-bold uppercase">{healthModalData.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">Protocol</span>
                  <span className="font-semibold">{healthModalData.protocol}</span>
                </div>
                <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">Error Count</span>
                  <span className="font-semibold text-red-600">{healthModalData.error_count}</span>
                </div>
                <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">Data Quality</span>
                  <span className="font-semibold text-emerald-600">{healthModalData.data_quality_score}%</span>
                </div>
                <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 block">Latency</span>
                  <span className="font-semibold">{healthModalData.connection_latency_ms} ms</span>
                </div>
              </div>

              <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
                <span className="font-bold block mb-1">Diagnostic Message:</span>
                {healthModalData.message}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setHealthModalData(null)}
                className="px-4 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-700 font-medium"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
