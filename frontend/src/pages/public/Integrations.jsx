import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Server, ShieldCheck, Database, Layers, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import heroIntegrations from '../../assets/hero-integrations.jpg';

export default function Integrations() {
  const sources = [
    { title: 'Utility Smart Meters', desc: 'Direct interval XML, Green Button, and utility portal REST API connectors.' },
    { title: 'Building Management Systems (BMS)', desc: 'Standard BACnet/IP, Modbus TCP/RTU, and MQTT gateway integrations.' },
    { title: 'Solar PV Inverters', desc: 'Inverter telemetry monitoring power output, DC/AC voltage, and grid frequency.' },
    { title: 'Battery Storage (BESS)', desc: 'BMS battery management interfaces for state-of-charge (SOC %) and dispatch state.' },
    { title: 'Submeter Hardware', desc: 'Current transformer (CT) submeter panels and pulse counter gateways.' },
    { title: 'Utility Billing Files', desc: 'Automated CSV, PDF invoice ingestion, and EDI 810 electronic bill processing.' }
  ];

  return (
    <div>
      <section style={{
        position: 'relative',
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.82)), url(${heroIntegrations})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '4.5rem 0 4rem 0',
        color: '#ffffff',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Hardware & Data Integration Architecture
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            GreenGrid is designed with open integration interfaces to ingest time-series telemetry from utility meters, on-site solar, battery storage, and building automation hardware.
          </p>
        </div>
      </section>

      {/* Integration Architecture Flow Chart Diagram */}
      <section style={{ padding: '4rem 0', background: 'var(--color-bg-main)' }}>
        <div className="container">
          
          <div className="card" style={{ padding: '2rem', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.5rem', textAlign: 'center' }}>
              GreenGrid Data Pipeline Architecture Flow
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '2.5rem' }}>
              How telemetry flows from hardware meters into executive dashboards and automated alerts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
              
              {/* Step 1 */}
              <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--color-bg-subtle)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', color: 'var(--color-primary)' }}>
                  <Cpu size={18} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Step 1</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>Data Sources</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>Meters, Inverters, BMS, EDI Files</div>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }} className="flow-arrow">
                <ArrowRight size={20} style={{ margin: '0 auto' }} />
              </div>

              {/* Step 2 */}
              <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--color-bg-subtle)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', color: 'var(--color-primary)' }}>
                  <Server size={18} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Step 2</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>Ingestion & REST API</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>High-Frequency Django REST Pipeline</div>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }} className="flow-arrow">
                <ArrowRight size={20} style={{ margin: '0 auto' }} />
              </div>

              {/* Step 3 */}
              <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--color-bg-subtle)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', color: 'var(--color-primary)' }}>
                  <Layers size={18} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Step 3</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>Data Normalization</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>Unit Standard, EUI, Timestamp Alignment</div>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }} className="flow-arrow">
                <ArrowRight size={20} style={{ margin: '0 auto' }} />
              </div>

              {/* Step 4 */}
              <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--color-bg-subtle)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', color: 'var(--color-energy-green)' }}>
                  <Zap size={18} />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Step 4</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>Dashboards & Alerts</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>Real-time EMIS UI & Peak Warnings</div>
              </div>

            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>
            Supported Ingestion Sources & Protocols
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {sources.map((s, idx) => (
              <div key={idx} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <CheckCircle2 size={18} color="var(--color-energy-green)" />
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {s.title}
                  </h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, paddingLeft: '1.75rem' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>
    </div>
  );
}
