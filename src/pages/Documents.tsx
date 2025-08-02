import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Eye, Download, CheckCircle, XCircle, Clock, Search, Filter, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Document {
  id: string;
  user_id: string;
  document_type_id: number;
  status: string;
  file_url: string;
  file_hash?: string;
  created_at: string;
  expires_at?: string;
  verification_notes?: string;
  metadata?: any;
  document_types?: {
    name: string;
    description: string;
  } | null;
  users?: {
    full_name: string;
  } | null;
}

interface DocumentType {
  id: number;
  name: string;
  description: string;
  required: boolean;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentTypeId, setDocumentTypeId] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'admin' || userRole === 'officer';

  useEffect(() => {
    fetchDocuments();
    fetchDocumentTypes();
    
    // Real-time subscription
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        () => fetchDocuments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDocumentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setDocumentTypes(data || []);
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          document_types(name, description),
          users!documents_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      // Se não for admin, só busca documentos do próprio usuário
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments((data as any) || []);
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

  const handleFileUpload = async () => {
    if (!file || !user) return;

    setUploadLoading(true);
    try {
      // Upload para Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obter URL público
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Salvar no banco
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_type_id: documentTypeId,
          file_url: publicUrl,
          file_hash: 'temp_hash', // Temporary hash
          status: 'pending',
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString()
          }
        });

      if (insertError) throw insertError;

      toast({
        title: 'Sucesso',
        description: 'Documento enviado com sucesso!',
      });

      setFile(null);
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar documento: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const updateDocumentStatus = async (docId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status,
          verification_notes: notes,
          verified_by: user?.id
        })
        .eq('id', docId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Status do documento atualizado!',
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar documento: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow;
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_types?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdmin ? 'Gerenciar Documentos' : 'Meus Documentos'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Verificar e aprovar documentos dos estudantes' : 'Gerencie e acompanhe o status dos seus documentos'}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar documentos..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section for Students */}
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Enviar Novo Documento</CardTitle>
            <CardDescription>
              Selecione um arquivo para upload
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <select
                value={documentTypeId}
                onChange={(e) => setDocumentTypeId(Number(e.target.value))}
                className="border rounded px-3 py-2 bg-background"
              >
                {documentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
                <option value="0">Outros</option>
              </select>
              <Button
                onClick={handleFileUpload}
                disabled={!file || uploadLoading}
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadLoading ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Types Required for Students */}
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Documentos Obrigatórios
            </CardTitle>
            <CardDescription>
              Certifique-se de ter todos os documentos necessários atualizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentTypes.filter(type => type.required).map((docType) => {
                const hasDocument = documents.some(doc => 
                  doc.document_type_id === docType.id && doc.status === 'approved'
                );
                return (
                  <div key={docType.id} className={`p-4 border rounded-lg ${hasDocument ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{docType.name}</span>
                      {hasDocument ? (
                        <Badge className="bg-green-500">✓ Válido</Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pendente</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          filteredDocuments.map((document) => (
            <Card key={document.id} className={`${document.status === 'rejected' ? 'border-red-200' : ''}`}>
              <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-start lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{document.document_types?.name || 'Documento'}</h3>
                        {isAdmin && (
                          <p className="text-sm text-muted-foreground truncate">Por: {document.users?.full_name}</p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Enviado: {new Date(document.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          {document.expires_at && (
                            <span className={`flex items-center gap-1 ${isExpiringSoon(document.expires_at) ? 'text-yellow-600 font-medium' : ''}`}>
                              <Calendar className="h-3 w-3" />
                              Expira: {new Date(document.expires_at).toLocaleDateString('pt-BR')}
                              {isExpiringSoon(document.expires_at) && (
                                <AlertCircle className="h-3 w-3 text-yellow-500" />
                              )}
                            </span>
                          )}
                        </div>
                      {document.status === 'rejected' && document.verification_notes && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">
                            <strong>Motivo da rejeição:</strong> {document.verification_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end gap-3 sm:shrink-0">
                    {getStatusBadge(document.status)}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild className="text-xs">
                        <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild className="text-xs">
                        <a href={document.file_url} download>
                          <Download className="h-3 w-3 mr-1" />
                          Baixar
                        </a>
                      </Button>
                      {isAdmin && document.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateDocumentStatus(document.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateDocumentStatus(document.id, 'rejected', 'Documento rejeitado')}
                            className="text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                      {document.status === 'rejected' && (
                        <Button size="sm" className="flex items-center gap-1 text-xs">
                          <Upload className="h-3 w-3" />
                          Reenviar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum documento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin ? 'Nenhum documento foi encontrado' : 'Comece enviando seus primeiros documentos para análise'}
              </p>
              {!isAdmin && (
                <Button className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Enviar Primeiro Documento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}