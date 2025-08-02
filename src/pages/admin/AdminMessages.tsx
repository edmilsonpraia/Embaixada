import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Plus, Eye, Reply, Users, Calendar, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  created_at: string;
  read: boolean;
  is_sms: boolean;
  sender?: {
    full_name: string;
    role: string;
  };
  receiver?: {
    full_name: string;
    role: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Conversation {
  user: User;
  lastMessage: Message;
  unreadCount: number;
  messages: Message[];
}

export default function AdminMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isNewConversationDialogOpen, setIsNewConversationDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [messageType, setMessageType] = useState('personal');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchMessages();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, email')
        .neq('id', user?.id);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          read,
          is_sms,
          sender:users!messages_sender_id_fkey(full_name, role),
          receiver:users!messages_receiver_id_fkey(full_name, role)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationsMap = new Map<string, Conversation>();
      
      (data || []).forEach((message: Message) => {
        const isFromCurrentUser = message.sender_id === user?.id;
        const partnerId = isFromCurrentUser ? message.receiver_id : message.sender_id;
        
        if (!partnerId) return;

        const partnerUser = users.find(u => u.id === partnerId) || {
          id: partnerId,
          full_name: isFromCurrentUser ? message.receiver?.full_name || 'Usuário' : message.sender?.full_name || 'Usuário',
          role: isFromCurrentUser ? message.receiver?.role || 'student' : message.sender?.role || 'student',
          email: ''
        };

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            user: partnerUser,
            lastMessage: message,
            unreadCount: 0,
            messages: []
          });
        }

        const conversation = conversationsMap.get(partnerId)!;
        conversation.messages.push(message);
        
        // Update unread count
        if (!message.read && message.receiver_id === user?.id) {
          conversation.unreadCount++;
        }

        // Update last message if this one is newer
        if (new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
          conversation.lastMessage = message;
        }
      });

      // Sort messages within each conversation
      conversationsMap.forEach(conversation => {
        conversation.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });

      setConversations(Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()));

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          receiver_id: selectedConversation.user.id,
          content: newMessage,
          is_sms: messageType === 'sms'
        })
        .select()
        .single();

      if (error) throw error;

      // If SMS, send via edge function
      if (messageType === 'sms') {
        try {
          // Get user phone number
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('phone')
            .eq('id', selectedConversation.user.id)
            .single();

          if (!userError && userData?.phone) {
            await supabase.functions.invoke('send-sms', {
              body: {
                phone: userData.phone,
                message: newMessage,
                type: 'admin_message'
              }
            });
          }
        } catch (smsError) {
          console.error('SMS error:', smsError);
        }
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedConversation.user.id,
          title: messageType === 'sms' ? 'Novo SMS' : 'Nova Mensagem',
          message: newMessage,
          type: messageType === 'sms' ? 'sms' : 'message',
          sender_id: user?.id
        });

      setNewMessage('');
      fetchMessages(); // Refresh messages
      
      toast({
        title: 'Sucesso',
        description: `${messageType === 'sms' ? 'SMS' : 'Mensagem'} enviada com sucesso`,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Mensagem apagada com sucesso',
      });

      fetchMessages(); // Refresh messages
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao apagar mensagem',
        variant: 'destructive',
      });
    }
  };

  const handleStartNewConversation = async () => {
    if (!selectedUser) return;

    const user = users.find(u => u.id === selectedUser);
    if (!user) return;

    const newConversation: Conversation = {
      user,
      lastMessage: {} as Message,
      unreadCount: 0,
      messages: []
    };

    setSelectedConversation(newConversation);
    setIsNewConversationDialogOpen(false);
    setSelectedUser('');
  };

  const markMessagesAsRead = async (conversation: Conversation) => {
    const unreadMessages = conversation.messages.filter(m => !m.read && m.receiver_id === user?.id);
    
    if (unreadMessages.length > 0) {
      await supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadMessages.map(m => m.id));
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await markMessagesAsRead(conversation);
    fetchMessages(); // Refresh to update read status
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mensagens</h1>
          <p className="text-muted-foreground">
            Gerencie conversas e comunicações do sistema
          </p>
        </div>
        <Button onClick={() => setIsNewConversationDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Conversas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.user.id}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?.user.id === conversation.user.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{conversation.user.full_name}</p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage.content || 'Iniciar conversa...'}
                        </p>
                        {conversation.lastMessage.created_at && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(conversation.lastMessage.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle>{selectedConversation.user.full_name}</CardTitle>
                    <CardDescription>
                      {selectedConversation.user.role === 'admin' ? 'Administrador' : 
                       selectedConversation.user.role === 'officer' ? 'Funcionário' : 'Estudante'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] group ${message.sender_id === user?.id ? 'order-2' : 'order-1'}`}>
                        <div className={`p-3 rounded-lg ${
                          message.sender_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs opacity-70">
                              {new Date(message.created_at).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                              {message.is_sms && <span className="ml-1">(SMS)</span>}
                            </p>
                            {message.sender_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <Select value={messageType} onValueChange={setMessageType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Mensagem</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="self-end"
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Selecione uma conversa</p>
                  <p className="text-sm">Escolha uma conversa da lista para começar a enviar mensagens</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={isNewConversationDialogOpen} onOpenChange={setIsNewConversationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Selecione um usuário para iniciar uma nova conversa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user">Usuário</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.role === 'admin' ? 'Admin' : user.role === 'officer' ? 'Funcionário' : 'Estudante'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleStartNewConversation} disabled={!selectedUser}>
              Iniciar Conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}