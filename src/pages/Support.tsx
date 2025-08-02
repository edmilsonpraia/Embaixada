import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Send, Phone, Mail, MessageSquare, FileText, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function Support() {
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.description.trim() || !ticketForm.category) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Criar ticket no banco
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: ticketForm.subject,
          description: ticketForm.description,
          category: ticketForm.category,
          priority: ticketForm.priority,
          status: 'open'
        });

      if (error) throw error;

      // Criar notificação para administradores
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (adminUsers && adminUsers.length > 0) {
        await Promise.all(
          adminUsers.map(admin => 
            supabase
              .from('notifications')
              .insert({
                user_id: admin.id,
                title: 'Novo Ticket de Suporte',
                message: `Novo ticket: ${ticketForm.subject}`,
                type: 'support_ticket',
                sender_id: user.id,
                is_read: false
              })
          )
        );
      }

      toast({
        title: 'Ticket enviado com sucesso!',
        description: 'Sua solicitação foi enviada. Você receberá uma resposta em breve.',
      });

      setTicketForm({
        subject: '',
        category: '',
        priority: 'medium',
        description: ''
      });
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar ticket: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const faqItems = [
    {
      question: 'Como posso enviar meus documentos?',
      answer: 'Você pode enviar seus documentos através da seção "Meus Documentos" no painel principal. Clique em "Novo Documento" e siga as instruções para fazer o upload. Certifique-se de que os arquivos estejam em formato PDF, DOC ou DOCX e tenham no máximo 10MB.'
    },
    {
      question: 'Quanto tempo demora para analisar meus documentos?',
      answer: 'O prazo médio de análise é de 3 a 5 dias úteis. Documentos com prioridade alta podem ser processados em até 24 horas. Você pode acompanhar o status dos seus documentos em tempo real no painel.'
    },
    {
      question: 'Que tipos de documentos posso enviar?',
      answer: 'Aceitamos certificados de conclusão, históricos escolares, diplomas, declarações acadêmicas e documentos relacionados à validação de estudos. Todos os documentos devem ser digitalizados com boa qualidade.'
    },
    {
      question: 'Como recebo notificações sobre meus documentos?',
      answer: 'Você receberá notificações por email sempre que houver uma atualização no status dos seus documentos. Também pode verificar as notificações diretamente no sistema.'
    },
    {
      question: 'Posso editar um documento após enviá-lo?',
      answer: 'Documentos já enviados não podem ser editados. Se precisar fazer correções, você deve enviar um novo documento ou entrar em contato com nosso suporte.'
    },
    {
      question: 'Como altero minha senha?',
      answer: 'No momento, para alterar sua senha você deve entrar em contato com nosso suporte. Em breve essa funcionalidade estará disponível diretamente no sistema.'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Central de Suporte</h1>
        <p className="text-muted-foreground mt-2">
          Encontre respostas para suas dúvidas ou entre em contato conosco
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Criar Ticket */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle>Criar Ticket de Suporte</CardTitle>
            </div>
            <CardDescription>
              Descreva seu problema ou dúvida e nossa equipe entrará em contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <Label htmlFor="subject">Assunto *</Label>
                <Input
                  id="subject"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="Resumo do seu problema"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={ticketForm.category} onValueChange={(value) => setTicketForm({ ...ticketForm, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Problema Técnico</SelectItem>
                      <SelectItem value="document">Documentos</SelectItem>
                      <SelectItem value="account">Conta de Usuário</SelectItem>
                      <SelectItem value="general">Dúvida Geral</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição detalhada *</Label>
                <Textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Descreva seu problema ou dúvida em detalhes..."
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Ticket
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Informações de Contato */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
              <CardDescription>
                Entre em contato conosco através dos canais abaixo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Telefone</p>
                  <p className="text-sm text-muted-foreground">+244 922 000 000</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">suporte@embaixada.ao</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Horário de Atendimento</p>
                  <p className="text-sm text-muted-foreground">Segunda a Sexta: 8h às 17h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status do Sistema</CardTitle>
              <CardDescription>
                Situação atual dos nossos serviços
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sistema de Upload</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Operacional</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Análise de Documentos</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Operacional</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Notificações Email</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Operacional</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>Perguntas Frequentes</CardTitle>
          </div>
          <CardDescription>
            Encontre respostas rápidas para as dúvidas mais comuns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}