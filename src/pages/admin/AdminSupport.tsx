import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { HelpCircle, MessageSquare, Clock, CheckCircle, AlertCircle, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  user_id: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          users!support_tickets_user_id_fkey(email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTickets = tickets?.map(ticket => ({
        id: ticket.id,
        title: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority || 'medium',
        category: ticket.category || 'general',
        user_id: ticket.user_id,
        assigned_to: ticket.assigned_to,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        user_email: ticket.users?.email || 'Email não disponível',
      })) || [];
      
      setTickets(mappedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar tickets de suporte',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status: newStatus, updated_at: new Date().toISOString() }
          : ticket
      ));

      toast({
        title: 'Sucesso',
        description: 'Status do ticket atualizado',
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar ticket',
        variant: 'destructive',
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !response.trim()) return;

    setSubmitting(true);
    try {
      // Get user phone number
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('phone')
        .eq('id', selectedTicket.user_id)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        toast({
          title: "Erro",
          description: "Erro ao buscar dados do usuário",
          variant: "destructive",
        });
        return;
      }

      // Criar notificação para o usuário
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedTicket.user_id,
          title: `Resposta do Suporte: ${selectedTicket.title}`,
          message: response,
          type: 'support_response',
          is_read: false
        });

      if (notificationError) throw notificationError;

      // Send SMS if user has phone number
      if (userData.phone) {
        try {
          const { error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: userData.phone,
              message: `Resposta ao seu ticket "${selectedTicket.title}": ${response}`,
              type: 'support_response'
            }
          });

          if (smsError) {
            console.error('Error sending SMS:', smsError);
            // Don't fail the whole operation if SMS fails
          }
        } catch (smsError) {
          console.error('Error sending SMS:', smsError);
          // Don't fail the whole operation if SMS fails
        }
      }

      // Atualizar status do ticket para "respondido"
      await handleUpdateTicketStatus(selectedTicket.id, 'in_progress');

      toast({
        title: 'Sucesso',
        description: userData.phone ? 'Resposta enviada por notificação e SMS' : 'Resposta enviada por notificação',
      });

      setIsResponseDialogOpen(false);
      setResponse('');
      setSelectedTicket(null);
    } catch (error) {
      console.error('Error sending response:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar resposta',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800">Resolvido</Badge>;
      case 'closed':
        return <Badge variant="secondary">Fechado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Média</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || ticket.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

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
          <h1 className="text-3xl font-bold text-foreground">Suporte</h1>
          <p className="text-muted-foreground">
            Gerencie tickets de suporte dos usuários
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(ticket.status)}
                  <div>
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <User className="h-3 w-3" />
                      <span>{ticket.user_email}</span>
                      <Calendar className="h-3 w-3 ml-2" />
                      <span>Criado em {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getPriorityBadge(ticket.priority)}
                  {getStatusBadge(ticket.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {ticket.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Select
                    value={ticket.status}
                    onValueChange={(value) => handleUpdateTicketStatus(ticket.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Responder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Responder Ticket</DialogTitle>
                      <DialogDescription>
                        Envie uma resposta para: {selectedTicket?.user_email}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="response">Resposta</Label>
                        <Textarea
                          id="response"
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="Digite sua resposta..."
                          rows={6}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSendResponse} disabled={submitting}>
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Enviar Resposta
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTickets.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum ticket encontrado</p>
              <p className="text-sm text-muted-foreground">Não há tickets de suporte com os filtros selecionados</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}