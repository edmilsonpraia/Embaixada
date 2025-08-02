import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, Activity, Eye, Download, Filter, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  user_id?: string;
  action_type: string;
  table_name?: string;
  record_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: string;
}

export default function AdminAudit() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar logs de auditoria',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const csvContent = [
        'Data,Usuário,Ação,Tabela,Registro,IP,User Agent',
        ...data.map(log => [
          new Date(log.created_at).toLocaleString('pt-BR'),
          log.user_id || 'Sistema',
          log.action_type,
          log.table_name || '',
          log.record_id || '',
          log.ip_address || '',
          log.user_agent || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Logs exportados com sucesso',
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao exportar logs',
        variant: 'destructive',
      });
    }
  };

  const getFilteredLogs = () => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.table_name && log.table_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
      const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const logDate = new Date(log.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = logDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = logDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesAction && matchesTable && matchesDate;
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge className="bg-green-100 text-green-800">CREATE</Badge>;
      case 'update':
        return <Badge className="bg-blue-100 text-blue-800">UPDATE</Badge>;
      case 'delete':
        return <Badge variant="destructive">DELETE</Badge>;
      default:
        return <Badge variant="outline">{action.toUpperCase()}</Badge>;
    }
  };

  const getUniqueValues = (field: keyof AuditLog) => {
    const values = auditLogs
      .map(log => log[field])
      .filter((value, index, array) => value && array.indexOf(value) === index)
      .sort();
    return values;
  };

  const filteredLogs = getFilteredLogs();

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
          <h1 className="text-3xl font-bold text-foreground">Auditoria do Sistema</h1>
          <p className="text-muted-foreground">
            Visualize todas as ações realizadas no sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchAuditLogs} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                {filteredLogs.length} de {auditLogs.length} registros encontrados
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  {getUniqueValues('action_type').map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tabelas</SelectItem>
                  {getUniqueValues('table_name').map(table => (
                    <SelectItem key={table} value={table}>{table}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Período</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última Semana</SelectItem>
                  <SelectItem value="month">Último Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      {getActionBadge(log.action_type)}
                      {log.table_name && (
                        <Badge variant="outline">{log.table_name}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {log.user_id ? `Usuário: ${log.user_id}` : 'Ação do sistema'}
                      {log.record_id && ` • Registro: ${log.record_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                      {log.ip_address && ` • IP: ${log.ip_address}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {log.metadata && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        alert(JSON.stringify(log.metadata, null, 2));
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && !loading && (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum log de auditoria encontrado</p>
                <p className="text-sm text-muted-foreground">Ajuste os filtros para ver mais resultados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}