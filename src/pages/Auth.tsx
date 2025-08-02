import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, FileText, Shield, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    email: '', 
    password: '', 
    fullName: '', 
    confirmPassword: '',
    university: '',
    city: '',
    biNumber: ''
  });
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: '' });

  // Russian universities list
  const russianUniversities = [
    'Universidade Estatal de Moscou (MSU)',
    'Universidade Técnica Estatal Bauman de Moscou',
    'Instituto de Física e Tecnologia de Moscou (MIPT)',
    'Universidade Nacional de Pesquisa Nuclear MEPhI',
    'Universidade Estatal de São Petersburgo',
    'Instituto Politécnico Pedro, o Grande de São Petersburgo',
    'Universidade Estatal de Novosibirsk',
    'Universidade Federal de Kazan',
    'Universidade Técnica Estatal de Moscou Stankin',
    'Universidade Russa da Amizade dos Povos (RUDN)',
    'Instituto de Aviação de Moscou',
    'Universidade Estatal de Tecnologia de Moscou Stankin',
    'Universidade Estatal de Economia de Moscou',
    'Universidade Estatal de Medicina de Moscou',
    'Instituto Estatal de Relações Internacionais de Moscou (MGIMO)',
    'Outras'
  ];

  // Russian cities list
  const russianCities = [
    'Moscou',
    'São Petersburgo',
    'Novosibirsk',
    'Ecaterimburgo',
    'Kazan',
    'Nizhny Novgorod',
    'Chelyabinsk',
    'Samara',
    'Omsk',
    'Rostov-on-Don',
    'Ufa',
    'Krasnoyarsk',
    'Voronezh',
    'Perm',
    'Volgograd',
    'Krasnodar',
    'Saratov',
    'Tyumen',
    'Tolyatti',
    'Izhevsk',
    'Outras'
  ];

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) {
        toast({
          title: 'Erro no Login',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(
        signupForm.email, 
        signupForm.password, 
        signupForm.fullName,
        {
          university: signupForm.university,
          city: signupForm.city,
          biNumber: signupForm.biNumber
        }
      );
      
      if (error) {
        toast({
          title: 'Erro no Cadastro',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Cadastro Realizado',
          description: 'Verifique seu email para confirmar a conta',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordForm.email,
        {
          redirectTo: `${window.location.origin}/auth`,
        }
      );

      if (error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email Enviado',
          description: 'Verifique seu email para redefinir a senha',
        });
        setShowForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding and Features */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Sistema Praia</h1>
                <p className="text-muted-foreground">Embaixada de Angola na Rússia</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-md">
              Sistema seguro de gestão documental para estudantes angolanos na Rússia
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
            <div className="bg-card p-4 rounded-lg border text-center">
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Documentos</h3>
              <p className="text-xs text-muted-foreground">Gestão segura</p>
            </div>
            <div className="bg-card p-4 rounded-lg border text-center">
              <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Segurança</h3>
              <p className="text-xs text-muted-foreground">Proteção total</p>
            </div>
            <div className="bg-card p-4 rounded-lg border text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Suporte</h3>
              <p className="text-xs text-muted-foreground">24/7 disponível</p>
            </div>
          </div>
        </div>

        {/* Right side - Authentication Forms */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            {showForgotPassword ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForgotPassword(false)}
                    className="absolute left-4 top-4"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle>Recuperar Senha</CardTitle>
                <CardDescription>
                  Digite seu email para receber as instruções de recuperação
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle>Acesso ao Sistema</CardTitle>
                <CardDescription>
                  Entre com suas credenciais ou crie uma nova conta
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={forgotPasswordForm.email}
                    onChange={(e) => setForgotPasswordForm({ email: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Instruções'}
                </Button>
              </form>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Digite sua senha"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Esqueceu a senha?
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 max-h-96 overflow-y-auto">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={signupForm.fullName}
                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-university">Universidade</Label>
                      <Select value={signupForm.university} onValueChange={(value) => setSignupForm({ ...signupForm, university: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua universidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {russianUniversities.map((university) => (
                            <SelectItem key={university} value={university}>
                              {university}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-city">Cidade</Label>
                      <Select value={signupForm.city} onValueChange={(value) => setSignupForm({ ...signupForm, city: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua cidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {russianCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-bi">Número do BI (Opcional)</Label>
                      <Input
                        id="signup-bi"
                        type="text"
                        placeholder="Número do seu Bilhete de Identidade"
                        value={signupForm.biNumber}
                        onChange={(e) => setSignupForm({ ...signupForm, biNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Digite uma senha forte"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="Confirme sua senha"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Cadastrando...' : 'Criar Conta'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
