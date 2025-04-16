
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const COLORS = ['#0c93e4', '#064f83', '#36adf6', '#005d9e'];

const dummyProcessData = [
  { name: 'Jan', count: 12 },
  { name: 'Fev', count: 19 },
  { name: 'Mar', count: 15 },
  { name: 'Abr', count: 25 },
  { name: 'Mai', count: 22 },
  { name: 'Jun', count: 30 },
];

const dummyStatusData = [
  { name: 'Concluído', value: 45 },
  { name: 'Em análise', value: 30 },
  { name: 'Aguardando', value: 15 },
  { name: 'Atrasado', value: 10 },
];

const Dashboard = () => {
  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <FileCheck className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Processos
              </p>
              <h3 className="text-2xl font-bold">123</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Processos Concluídos
              </p>
              <h3 className="text-2xl font-bold">45</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </p>
              <h3 className="text-2xl font-bold">45</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pendentes
              </p>
              <h3 className="text-2xl font-bold">33</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card className="border-sei-100">
          <CardHeader>
            <CardTitle>Processos por mês</CardTitle>
            <CardDescription>Número de processos cadastrados mensalmente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dummyProcessData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0c93e4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardHeader>
            <CardTitle>Status dos processos</CardTitle>
            <CardDescription>Distribuição atual por status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dummyStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dummyStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
