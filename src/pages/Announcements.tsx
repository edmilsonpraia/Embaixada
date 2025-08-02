import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  send_as_sms: boolean;
  expires_at?: string;
  created_at: string;
  author_id: string;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar anúncios não expirados
      const activeAnnouncements = (data || []).filter(announcement => {
        if (!announcement.expires_at) return true;
        return new Date(announcement.expires_at) > new Date();
      });

      setAnnouncements(activeAnnouncements);
      
      // Marcar anúncios como visualizados
      if (data && data.length > 0) {
        const { error: updateError } = await supabase
          .from('announcement_recipients')
          .update({ viewed: true })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .in('announcement_id', data.map(a => a.id));
        
        if (updateError) console.error('Error marking announcements as viewed:', updateError);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar anúncios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta Prioridade</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Média Prioridade</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa Prioridade</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
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
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="px-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Anúncios</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Fique por dentro das últimas novidades e comunicados importantes
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-0.5">
                    {getPriorityIcon(announcement.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl break-words">{announcement.title}</CardTitle>
                    <CardDescription className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 mt-2">
                      <span className="flex items-center space-x-1 text-xs sm:text-sm">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          Publicado em {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </span>
                      {announcement.expires_at && (
                        <span className="flex items-center space-x-1 text-xs sm:text-sm">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            Válido até {new Date(announcement.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {getPriorityBadge(announcement.priority)}
                  {announcement.send_as_sms && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      SMS
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground leading-relaxed text-sm sm:text-base">
                  {announcement.content}
                </p>
              </div>
              
              {announcement.expires_at && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-muted/50 rounded-lg border-l-4 border-orange-400">
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>
                      Este anúncio expira em {' '}
                      {new Date(announcement.expires_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {announcements.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum anúncio disponível
              </h3>
              <p className="text-muted-foreground">
                Não há anúncios ativos no momento. Volte em breve para verificar novidades.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
