import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import nottifyLogo from "@/assets/nottify-logo.png";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  TrendingUp, 
  Shield, 
  Bell, 
  Zap, 
  BarChart3, 
  Lock,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Star,
  Quote
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Removed auto-redirect to allow users to stay on landing page

  const features = [
    {
      icon: TrendingUp,
      title: "Monitoramento em Tempo Real",
      description: "Acompanhe seu PnL com atualizações a cada 5 segundos direto da Binance Futures"
    },
    {
      icon: Bell,
      title: "Alertas Inteligentes",
      description: "Configure notificações personalizadas para lucros, perdas e limites de risco"
    },
    {
      icon: Shield,
      title: "Kill-Switch Automático",
      description: "Proteja sua banca com fechamento automático de posições em caso de perdas"
    },
    {
      icon: Lock,
      title: "Segurança Total",
      description: "Autenticação 2FA (TOTP) e criptografia de dados sensíveis"
    },
    {
      icon: BarChart3,
      title: "Dashboard Profissional",
      description: "Visualize métricas, gráficos e histórico de operações de forma clara"
    },
    {
      icon: Zap,
      title: "Setup Rápido",
      description: "Conecte sua conta Binance em minutos e comece a monitorar imediatamente"
    }
  ];

  const stats = [
    { value: "5s", label: "Atualização" },
    { value: "24/7", label: "Monitoramento" },
    { value: "100%", label: "Uptime" },
    { value: "<1min", label: "Setup" }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Crie sua Conta",
      description: "Cadastre-se com email e configure autenticação 2FA para máxima segurança"
    },
    {
      step: "2",
      title: "Conecte a Binance",
      description: "Adicione suas API keys da Binance Futures de forma segura e criptografada"
    },
    {
      step: "3",
      title: "Configure Alertas",
      description: "Defina limites de risco, alertas personalizados e ative o kill-switch"
    },
    {
      step: "4",
      title: "Monitore em Tempo Real",
      description: "Acompanhe seu PnL, posições abertas e receba notificações instantâneas"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  const testimonials = [
    {
      name: "Carlos Silva",
      role: "Day Trader",
      avatar: "",
      initials: "CS",
      rating: 5,
      text: "O NOTTIFY mudou completamente minha forma de operar. Agora tenho controle total sobre minhas posições e o kill-switch já me salvou várias vezes. Melhor investimento que fiz!"
    },
    {
      name: "Marina Costa",
      role: "Swing Trader",
      avatar: "",
      initials: "MC",
      rating: 5,
      text: "Excelente ferramenta! Os alertas personalizados são perfeitos e me mantêm informada mesmo quando não estou monitorando. Interface muito profissional e fácil de usar."
    },
    {
      name: "Roberto Mendes",
      role: "Scalper",
      avatar: "",
      initials: "RM",
      rating: 5,
      text: "A atualização a cada 5 segundos é essencial para meu estilo de trading. Dashboard limpo, informações precisas e a segurança 2FA me dá muita confiança."
    },
    {
      name: "Juliana Alves",
      role: "Position Trader",
      avatar: "",
      initials: "JA",
      rating: 5,
      text: "Gerencio múltiplas contas e o NOTTIFY facilita demais. Consigo alternar entre elas rapidamente e configurar proteções diferentes para cada estratégia. Recomendo muito!"
    },
    {
      name: "Pedro Santos",
      role: "Trader Profissional",
      avatar: "",
      initials: "PS",
      rating: 5,
      text: "Finalmente uma ferramenta que entende o trader brasileiro. Setup rápido, preço justo e funciona perfeitamente. O suporte também é excelente!"
    },
    {
      name: "Ana Oliveira",
      role: "Trader Iniciante",
      avatar: "",
      initials: "AO",
      rating: 5,
      text: "Como iniciante, o NOTTIFY me ajudou muito a aprender gerenciamento de risco. Os alertas me ensinam quando estou ultrapassando limites e o kill-switch me protege."
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <motion.section 
        className="relative min-h-screen flex items-center justify-center px-4 py-20"
        style={{ y, opacity }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        <motion.div 
          className="relative z-10 text-center space-y-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="flex items-center justify-center gap-4 mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.img 
              src={nottifyLogo} 
              alt="NOTTIFY" 
              className="w-24 h-24"
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            />
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              NOTTIFY
            </h1>
          </motion.div>
          
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Monitor PnL Profissional para Binance Futures
          </motion.h2>
          
          <motion.p 
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Monitore seus lucros e perdas em tempo real, configure alertas inteligentes 
            e proteja sua banca com kill-switch automático. Tudo em um dashboard profissional.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg"
                className="group text-lg px-8"
                onClick={() => navigate("/signup")}
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg"
                variant="outline"
                className="text-lg px-8"
                onClick={() => navigate("/login")}
              >
                Já Tenho Conta
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center">
            <motion.div 
              className="w-1.5 h-1.5 bg-primary rounded-full mt-2"
              animate={{ y: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-card/50 backdrop-blur-sm">
        <motion.div 
          className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {stats.map((stat, index) => (
            <motion.div 
              key={index}
              className="text-center"
              variants={itemVariants}
              whileHover={{ scale: 1.1 }}
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tudo que Você Precisa
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas profissionais para monitorar e proteger seus investimentos
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
              >
                <Card className="h-full border-2 hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-4">
                    <motion.div 
                      className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.icon className="h-7 w-7 text-primary" />
                    </motion.div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="flex items-center justify-center gap-3 mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Quote className="h-10 w-10 text-primary" />
              <h2 className="text-4xl md:text-5xl font-bold">
                O Que Nossos Traders Dizem
              </h2>
            </motion.div>
            <p className="text-xl text-muted-foreground">
              Depoimentos reais de quem já usa o NOTTIFY
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="px-12"
          >
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -8, transition: { duration: 0.3 } }}
                      className="p-1 h-full"
                    >
                      <Card className="h-full border-2 hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                        <CardContent className="p-6 space-y-4 flex flex-col h-full">
                          {/* Rating Stars */}
                          <div className="flex gap-1">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * i }}
                              >
                                <Star className="h-5 w-5 fill-primary text-primary" />
                              </motion.div>
                            ))}
                          </div>

                          {/* Quote Icon */}
                          <Quote className="h-8 w-8 text-primary/20" />

                          {/* Testimonial Text */}
                          <p className="text-muted-foreground flex-grow italic">
                            "{testimonial.text}"
                          </p>

                          {/* Author Info */}
                          <div className="flex items-center gap-3 pt-4 border-t border-border">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage src={testimonial.avatar} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {testimonial.initials}
                                </AvatarFallback>
                              </Avatar>
                            </motion.div>
                            <div>
                              <p className="font-bold">{testimonial.name}</p>
                              <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          </motion.div>

          {/* Stats Below Testimonials */}
          <motion.div 
            className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">Traders Ativos</div>
            </motion.div>
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-4xl font-bold text-primary mb-2">4.9/5</div>
              <div className="text-sm text-muted-foreground">Avaliação Média</div>
            </motion.div>
            <motion.div 
              className="text-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-4xl font-bold text-primary mb-2">1M+</div>
              <div className="text-sm text-muted-foreground">Alertas Enviados</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-muted-foreground">
              Setup simples em 4 passos
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {howItWorks.map((item, index) => (
              <motion.div
                key={index}
                className="relative"
                variants={itemVariants}
              >
                <Card className="h-full border-2 hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-4">
                    <motion.div 
                      className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4"
                      whileHover={{ scale: 1.2, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      {item.step}
                    </motion.div>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
                
                {index < howItWorks.length - 1 && (
                  <motion.div 
                    className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10"
                    initial={{ x: -10, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <ArrowRight className="h-8 w-8 text-primary" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-card/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="flex items-center justify-center gap-3 mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <HelpCircle className="h-10 w-10 text-primary" />
              <h2 className="text-4xl md:text-5xl font-bold">
                Perguntas Frequentes
              </h2>
            </motion.div>
            <p className="text-xl text-muted-foreground">
              Tire suas dúvidas sobre o NOTTIFY
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <AccordionItem value="item-1" className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg px-6">
                  <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                    Como funciona o monitoramento em tempo real?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    O NOTTIFY se conecta diretamente à API da Binance Futures usando suas credenciais seguras. 
                    A cada 5 segundos, coletamos informações atualizadas sobre seu saldo, posições abertas e PnL. 
                    Todos os dados são processados em tempo real e exibidos no dashboard de forma clara e organizada.
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <AccordionItem value="item-2" className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg px-6">
                  <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                    Minhas API keys da Binance estão seguras?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Sim! Utilizamos criptografia de ponta a ponta para armazenar suas credenciais. Suas API keys 
                    são criptografadas antes de serem salvas no banco de dados. Além disso, implementamos autenticação 
                    2FA (TOTP) para proteger o acesso à sua conta. Recomendamos criar API keys apenas com permissões 
                    de leitura e execução de ordens, sem permissão de saque.
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <AccordionItem value="item-3" className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg px-6">
                  <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                    Como funciona o Kill-Switch automático?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    O Kill-Switch é uma proteção automática que fecha todas as suas posições abertas quando sua perda 
                    atinge o limite configurado. Você define a porcentagem máxima de perda aceitável e o saldo inicial. 
                    Quando o limite é atingido, o sistema fecha todas as posições instantaneamente para proteger sua banca. 
                    Você pode ativar/desativar e configurar o reset diário nas configurações.
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <AccordionItem value="item-4" className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg px-6">
                  <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                    Posso conectar múltiplas contas da Binance?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Sim! O NOTTIFY permite adicionar e gerenciar múltiplas contas Binance. Você pode alternar entre 
                    elas facilmente no dashboard e configurar alertas e proteções específicas para cada conta. 
                    Todas as contas são protegidas com a mesma segurança e podem ser monitoradas simultaneamente.
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <AccordionItem value="item-5" className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg px-6">
                  <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                    Como funcionam os alertas personalizados?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Você pode configurar alertas para diversos eventos: lucro atingido, perda máxima, mudança de saldo, 
                    e muito mais. Os alertas aparecem em tempo real no dashboard e podem ser customizados com diferentes 
                    níveis de severidade. Configure os limites que fazem sentido para sua estratégia de trading.
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                <AccordionItem value="item-6" className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg px-6">
                  <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                    Qual é a política de cancelamento?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    A assinatura mensal de $15 dá acesso completo por 30 dias. Você pode cancelar a qualquer momento 
                    através das configurações da sua conta. Não há período de fidelidade ou taxas de cancelamento. 
                    Seu acesso permanece ativo até o fim do período pago. Também oferecemos vouchers para períodos 
                    específicos de acesso.
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <AccordionItem value="item-7" className="bg-card/50 backdrop-blur-sm border-2 border-border rounded-lg px-6">
                  <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                    Quais métodos de pagamento são aceitos?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Aceitamos pagamentos em criptomoedas (valor equivalente a $15 USD) através de várias redes blockchain. 
                    O pagamento é confirmado automaticamente após 3 confirmações na rede. Também oferecemos vouchers 
                    que podem ser ativados instantaneamente para acesso imediato. O processo é rápido, seguro e totalmente automatizado.
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Preço Simples e Transparente
            </h2>
            <p className="text-xl text-muted-foreground">
              Acesso completo a todas as funcionalidades
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="max-w-md mx-auto border-2 border-primary">
              <CardContent className="p-8 text-center space-y-6">
                <div>
                  <div className="text-5xl font-bold text-primary mb-2">$15</div>
                  <div className="text-muted-foreground">por mês</div>
                </div>

                <ul className="space-y-3 text-left">
                  {[
                    "Monitoramento em tempo real (5s)",
                    "Alertas ilimitados personalizáveis",
                    "Kill-switch automático",
                    "Autenticação 2FA",
                    "Dashboard profissional",
                    "Múltiplas contas Binance",
                    "Suporte prioritário"
                  ].map((feature, index) => (
                    <motion.li 
                      key={index}
                      className="flex items-start gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    className="w-full text-lg"
                    onClick={() => navigate("/signup")}
                  >
                    Começar Agora
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/10 via-success/10 to-primary/10">
        <motion.div 
          className="max-w-4xl mx-auto text-center space-y-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Pronto para Proteger Seus Investimentos?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Junte-se aos traders que já estão monitorando suas operações com segurança e eficiência
          </p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              size="lg"
              className="text-lg px-8"
              onClick={() => navigate("/signup")}
            >
              Criar Conta Grátis
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img src={nottifyLogo} alt="NOTTIFY" className="w-8 h-8" />
            <span className="text-xl font-bold">NOTTIFY</span>
          </div>
          <p className="text-muted-foreground">
            Monitor PnL Profissional para Binance Futures
          </p>
          <div className="text-sm text-muted-foreground">
            © 2025 NOTTIFY. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
