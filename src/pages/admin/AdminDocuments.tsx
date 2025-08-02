import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileText, Check, X, Eye, Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Document {
  id: string;
  user_id: string;
  document_type_id: number;
  status: string;
  file_url: string;
  metadata: any;
  verification_notes?: string;
  created_at: string;
  document_types: {
    name: string;
    description: string;
  } | null;
  users: {
    full_name: string;
  } | null;
}

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          document_types (name, description),
          users!documents_user_id_fkey (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar documentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = async (documentId: string, action: 'approved' | 'rejected') => {
    if (!user) return;

    setProcessingId(documentId);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: action,
          verified_by: user.id,
          verification_notes: verificationNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Documento ${action === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso`,
      });

      setSelectedDocument(null);
      setVerificationNotes('');
      fetchDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar documento',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const downloadDocument = async (document: Document) => {
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = document.file_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = urlParts.slice(-2).join('/'); // Pega userId/fileName
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${document.document_types?.name || 'documento'}_${document.users?.full_name || 'usuario'}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Sucesso',
        description: 'Documento baixado com sucesso',
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao baixar documento',
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      (doc.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (doc.document_types?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Verificação de Documentos</h1>
          <p className="text-muted-foreground">
            Analise e aprove documentos submetidos pelos usuários
          </p>
        </div>
        <Button onClick={fetchDocuments} variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Documentos</CardTitle>
              <CardDescription>
                Total de {filteredDocuments.length} documentos encontrados
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-80"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{document.document_types?.name || 'Documento'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {document.users?.full_name || 'Usuário não encontrado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviado em {new Date(document.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    {getStatusBadge(document.status)}
                    {document.verification_notes && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                        {document.verification_notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(document.file_url, '_blank')}
                      title="Visualizar documento"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => downloadDocument(document)}
                      title="Baixar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {document.status === 'pending' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setSelectedDocument(document)}
                          >
                            Verificar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Verificar Documento</DialogTitle>
                            <DialogDescription>
                              {document.document_types?.name || 'Documento'} - {document.users?.full_name || 'Usuário não encontrado'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Notas de Verificação</label>
                              <Textarea
                                placeholder="Adicione notas sobre a verificação..."
                                value={verificationNotes}
                                onChange={(e) => setVerificationNotes(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <DialogFooter className="space-x-2">
                            <Button
                              variant="destructive"
                              onClick={() => handleDocumentAction(document.id, 'rejected')}
                              disabled={processingId === document.id}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Rejeitar
                            </Button>
                            <Button
                              onClick={() => handleDocumentAction(document.id, 'approved')}
                              disabled={processingId === document.id}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Aprovar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredDocuments.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum documento encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}