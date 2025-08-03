import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { BarChart3, Download, Users, FileText, TrendingUp, Calendar, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  role: string;
  university?: string;
  city?: string;
  bi_number?: string;
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    recentActivity: []
  });
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchUsers, setSearchUsers] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
    fetchUsers();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch documents stats
      const { data: documentsData } = await supabase
        .from('documents')
        .select('status, created_at');

      const totalDocs = documentsData?.length || 0;
      const pending = documentsData?.filter(d => d.status === 'pending').length || 0;
      const approved = documentsData?.filter(d => d.status === 'approved').length || 0;
      const rejected = documentsData?.filter(d => d.status === 'rejected').length || 0;

      setReportData({
        totalUsers: usersCount || 0,
        totalDocuments: totalDocs,
        pendingDocuments: pending,
        approvedDocuments: approved,
        rejectedDocuments: rejected,
        recentActivity: []
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do relatório',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          created_at,
          role,
          profiles!inner(university, city, bi_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers = data?.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at,
        role: user.role,
        university: user.profiles?.university || 'Não informado',
        city: user.profiles?.city || 'Não informado',
        bi_number: user.profiles?.bi_number || 'Não informado'
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const exportReport = () => {
    const csvContent = `Tipo,Valor
Usuários Totais,${reportData.totalUsers}
Documentos Totais,${reportData.totalDocuments}
Documentos Pendentes,${reportData.pendingDocuments}
Documentos Aprovados,${reportData.approvedDocuments}
Documentos Rejeitados,${reportData.rejectedDocuments}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Sucesso',
      description: 'Relatório exportado com sucesso',
    });
  };

  const exportUsersReport = () => {
    const csvContent = `Nome,Email,Universidade,Cidade,BI,Tipo,Data de Registro
${filteredUsers.map(user => 
  `"${user.full_name}","${user.email}","${user.university}","${user.city}","${user.bi_number}","${user.role}","${new Date(user.created_at).toLocaleDateString('pt-BR')}"`
).join('\n')}`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Sucesso',
      description: 'Lista de usuários exportada com sucesso',
    });
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.university?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.city?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise estatística e relatórios do sistema
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Total de usuários registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Totais</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Total de documentos enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando análise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.totalDocuments > 0 
                ? Math.round((reportData.approvedDocuments / reportData.totalDocuments) * 100)
                : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Documentos aprovados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Documentos</CardTitle>
            <CardDescription>Distribuição atual dos documentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Aprovados</Badge>
                <span className="text-sm">{reportData.approvedDocuments}</span>
              </div>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500"
                  style={{ 
                    width: `${reportData.totalDocuments > 0 ? (reportData.approvedDocuments / reportData.totalDocuments) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Pendentes</Badge>
                <span className="text-sm">{reportData.pendingDocuments}</span>
              </div>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500"
                  style={{ 
                    width: `${reportData.totalDocuments > 0 ? (reportData.pendingDocuments / reportData.totalDocuments) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Rejeitados</Badge>
                <span className="text-sm">{reportData.rejectedDocuments}</span>
              </div>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500"
                  style={{ 
                    width: `${reportData.totalDocuments > 0 ? (reportData.rejectedDocuments / reportData.totalDocuments) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estatísticas Gerais</CardTitle>
            <CardDescription>Resumo das atividades do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Gráficos detalhados em desenvolvimento</p>
              <p className="text-sm text-muted-foreground">
                Funcionalidade completa será implementada em breve
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Usuários Registrados */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Usuários Registrados</CardTitle>
              <CardDescription>Lista completa de todos os usuários do sistema</CardDescription>
            </div>
            <Button onClick={exportUsersReport} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar Lista
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar usuários..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Universidade</TableHead>
                    <TableHead className="hidden md:table-cell">Cidade</TableHead>
                    <TableHead className="hidden lg:table-cell">BI</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead>Data de Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {user.university}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {user.city}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {user.bi_number}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Empty State */}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
                <p className="text-muted-foreground">
                  {searchUsers ? 'Tente ajustar os filtros de pesquisa' : 'Nenhum usuário foi registrado ainda'}
                </p>
              </div>
            )}

            {/* Pagination Info */}
            {filteredUsers.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Mostrando {filteredUsers.length} de {users.length} usuários
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
