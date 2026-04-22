import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import axios from 'axios';

// Mocked data
const recordCounts = { baptism: 124, marriage: 53, funeral: 39 };
const monthlyData = [
  { month: 'Jan', count: 15 },
  { month: 'Feb', count: 12 },
  { month: 'Mar', count: 18 },
  { month: 'Apr', count: 20 },
  { month: 'May', count: 22 },
  { month: 'Jun', count: 17 },
  { month: 'Jul', count: 19 },
  { month: 'Aug', count: 21 },
  { month: 'Sep', count: 16 },
  { month: 'Oct', count: 14 },
  { month: 'Nov', count: 13 },
  { month: 'Dec', count: 11 },
];
const clergyStats = [
  { name: 'Fr. John', count: 24 },
  { name: 'Fr. Alex', count: 19 },
  { name: 'Fr. George', count: 15 },
  { name: 'Fr. Paul', count: 12 },
  { name: 'Fr. Mark', count: 10 },
];
const ageDist = [
  { ageGroup: '0-10', count: 12 },
  { ageGroup: '11-20', count: 18 },
  { ageGroup: '21-30', count: 25 },
  { ageGroup: '31-40', count: 20 },
  { ageGroup: '41-50', count: 15 },
  { ageGroup: '51-60', count: 10 },
  { ageGroup: '61+', count: 5 },
];
const genderDist = [
  { gender: 'Male', count: 66 },
  { gender: 'Female', count: 58 },
];
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb'];

const FEAST_ORDER = [
  'Nativity', 'Theophany', 'Annunciation', 'Transfiguration', 'Dormition', 'Elevation of the Cross', 'Pascha'
];
const RECORD_TYPES = ['baptism', 'marriage', 'funeral'];
const RECORD_LABELS = { baptism: 'Baptism', marriage: 'Marriage', funeral: 'Funeral' };
const RECORD_COLORS = { baptism: '#8884d8', marriage: '#82ca9d', funeral: '#ffc658' };

const AnalyticsDashboard: React.FC = () => {
  // --- Sacraments on Major Feasts ---
  const [feastData, setFeastData] = useState<any[]>([]);
  const [feastLoading, setFeastLoading] = useState(false);
  const [feastError, setFeastError] = useState<string | null>(null);

  useEffect(() => {
    setFeastLoading(true);
    setFeastError(null);
    axios.get('/api/analytics/by-feast-day', { withCredentials: true })
      .then(res => {
        // Only show most recent year for Pascha and fixed feasts
        const now = new Date();
        const year = now.getFullYear();
        // Group by feast and type, keep only most recent year for each feast
        const filtered = FEAST_ORDER.flatMap(feast => {
          const feastRows = res.data.filter((row: any) => row.feast === feast);
          if (feast === 'Pascha') {
            // Only most recent Pascha
            const paschaRows = feastRows.filter((row: any) => row.date.startsWith(year.toString()));
            return paschaRows;
          } else {
            // Only current year for fixed feasts
            return feastRows.filter((row: any) => row.date.startsWith(year.toString()));
          }
        });
        // Pivot to { feast, Baptism, Marriage, Funeral }
        const grouped: any = {};
        filtered.forEach((row: any) => {
          if (!grouped[row.feast]) grouped[row.feast] = { feast: row.feast, date: row.date };
          grouped[row.feast][row.type] = row.count;
        });
        setFeastData(Object.values(grouped));
      })
      .catch(err => {
        setFeastError('Error loading feast analytics');
      })
      .finally(() => setFeastLoading(false));
  }, []);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Church Records Analytics</h1>
      <p className="mb-6 text-gray-600">Visual analytics for SSPPOC baptism, marriage, and funeral records</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Total Record Counts */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Total Record Counts</h2>
          <div className="flex w-full justify-around mt-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-blue-600">{recordCounts.baptism}</span>
              <span className="text-gray-500">Baptisms</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-green-600">{recordCounts.marriage}</span>
              <span className="text-gray-500">Marriages</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-purple-600">{recordCounts.funeral}</span>
              <span className="text-gray-500">Funerals</span>
            </div>
          </div>
        </div>
        {/* Monthly Record Activity */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">Monthly Record Activity</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Top Clergy by Record Count */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">Top 5 Clergy by Record Count</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={clergyStats} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Age Distribution */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">Age Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageDist} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageGroup" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Gender Distribution (full width on mobile, half on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Gender Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={genderDist}
                dataKey="count"
                nameKey="gender"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {genderDist.map((entry, index) => (
                  <Cell key={`cell-gender-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sacraments on Major Feasts */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-2">Sacraments on Major Feasts</h2>
        <p className="mb-4 text-gray-600">Number of baptisms, marriages, and funerals performed on major Orthodox feast days (current year)</p>
        {feastLoading && <div className="text-gray-500">Loading...</div>}
        {feastError && <div className="text-red-500">{feastError}</div>}
        {!feastLoading && !feastError && feastData.length > 0 && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={feastData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="feast" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: any, name: any, props: any) => [`${value}`, RECORD_LABELS[name as keyof typeof RECORD_LABELS]]} />
              <Legend />
              {RECORD_TYPES.map(type => (
                <Bar key={type} dataKey={type} name={RECORD_LABELS[type as keyof typeof RECORD_LABELS]} fill={RECORD_COLORS[type as keyof typeof RECORD_COLORS]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {!feastLoading && !feastError && feastData.length === 0 && (
          <div className="text-gray-500">No feast day data available for this year.</div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 