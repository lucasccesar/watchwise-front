import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { legalDocumentMarkdown } from './legal-documents';
import { LegalDocument, LegalDocumentPage, parseLegalDocument } from './legal-document-parser';

type PublicInfoPage = 'terms' | 'privacy' | 'guidelines' | 'help';
type HelpQuestion = { question: string; answer: string };
type HelpCategory = { id: string; icon: string; title: string; description: string; questions: HelpQuestion[] };

@Component({
  selector: 'app-public-info',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-info.component.html',
  styleUrl: './public-info.component.css',
})
export class PublicInfoComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly page = this.route.snapshot.data['publicPage'] as PublicInfoPage;
  protected readonly expandedQuestions = signal<ReadonlySet<string>>(new Set());
  protected readonly tocOpen = signal(false);

  protected readonly documents = [
    { id: 'terms', title: 'Termos de Uso', subtitle: 'Regras para usar o serviço', href: '/terms' },
    { id: 'privacy', title: 'Privacidade', subtitle: 'Como seus dados são tratados', href: '/privacy' },
    { id: 'guidelines', title: 'Diretrizes da comunidade', subtitle: 'O que você pode publicar', href: '/community-guidelines' },
  ];

  private readonly legalPage: LegalDocumentPage = this.page === 'help' ? 'terms' : this.page;
  protected readonly legalDocument: LegalDocument = parseLegalDocument(
    this.legalPage,
    legalDocumentMarkdown[this.legalPage],
  );
  protected readonly helpCategories: HelpCategory[] = [
    { id: 'conta-e-acesso', icon: 'user', title: 'Conta e acesso', description: 'Login, senha e exclusão da conta', questions: [
      { question: 'O Watchwise é gratuito?', answer: 'Sim. Na versão atual, o Watchwise é gratuito e não oferece pagamentos ou assinaturas.' },
      { question: 'Posso entrar com o Google?', answer: 'Sim. Você pode iniciar a autenticação com uma conta Google existente.' },
      { question: 'Esqueci minha senha. O que faço?', answer: 'Use o link “Esqueceu a senha?” na tela de login. Se a recuperação não estiver disponível, entre em contato com o suporte.' },
      { question: 'Como excluo minha conta?', answer: 'Acesse Configurações e escolha a opção de exclusão da conta. A ação pede confirmação da senha.' },
    ] },
    { id: 'privacidade-e-perfil', icon: 'lock', title: 'Privacidade e perfil', description: 'Visibilidade, imagens e seus dados', questions: [
      { question: 'Meu perfil é público?', answer: 'O perfil pode ser público ou privado. Confira e altere a visibilidade nas configurações do perfil.' },
      { question: 'Quem pode ver minhas listas?', answer: 'Cada lista pode ter sua própria visibilidade: pública, apenas seguidores ou privada.' },
      { question: 'Como altero minha foto de perfil ou a imagem do banner?', answer: 'Edite seu perfil e informe uma URL de imagem que você tenha autorização para usar.' },
      { question: 'Posso baixar meus dados?', answer: 'A exportação de dados não está disponível no autoatendimento analisado. Use o canal de privacidade para fazer uma solicitação.' },
    ] },
    { id: 'comunidade-e-denuncias', icon: 'flag', title: 'Comunidade e denúncias', description: 'Spoilers, denúncias e moderação', questions: [
      { question: 'Como denuncio um conteúdo ou perfil?', answer: 'Abra o menu de opções do conteúdo ou perfil e escolha “Denunciar”. Informe apenas os detalhes necessários.' },
      { question: 'O que acontece após denunciar?', answer: 'Uma pessoa autorizada revisa a denúncia manualmente. O envio não garante remoção ou prazo de resposta.' },
      { question: 'Vi um spoiler sem aviso. O que faço?', answer: 'Denuncie o conteúdo. Comentários e resenhas podem ser marcados como spoiler.' },
      { question: 'Encontrei uma infração autoral.', answer: 'Canal específico para avisos e contranotificações: [A preencher antes da publicação].' },
    ] },
    { id: 'filmes-e-series', icon: 'film', title: 'Filmes e séries', description: 'Origem e correção de dados do catálogo', questions: [
      { question: 'De onde vêm as informações de filmes e séries?', answer: 'O Watchwise usa dados de catálogo fornecidos pelo TMDB. O serviço não é endossado nem certificado pelo TMDB.' },
      { question: 'Encontrei um dado incorreto.', answer: 'As informações vêm do catálogo do TMDB. Você pode consultar e sugerir correções diretamente na plataforma do catálogo.' },
    ] },
  ];

  protected readonly contacts = [
    { icon: 'mail', title: 'Suporte e dúvidas gerais', description: 'Problemas com sua conta, o aplicativo ou o uso do serviço.', channel: '[PREENCHER: e-mail ou formulário]' },
    { icon: 'shield', title: 'Privacidade e dados pessoais', description: 'Acesso, correção, exclusão ou cópia dos seus dados.', channel: '[PREENCHER: canal de privacidade]' },
    { icon: 'flag', title: 'Denúncias e recursos', description: 'Para quem não tem conta ou quer recorrer de uma decisão.', channel: '[PREENCHER: e-mail ou formulário]' },
    { icon: 'copyright', title: 'Direitos autorais', description: 'Notificações de infração e contranotificações.', channel: '[PREENCHER: agente e procedimento]' },
  ];

  protected title(): string {
    return this.page === 'help' ? 'Ajuda e contato' : this.legalDocument.title;
  }

  protected documentTabsLabel(): string { return 'Documentos legais'; }
  protected toggleToc(): void { this.tocOpen.update((open) => !open); }
  protected toggleQuestion(key: string): void {
    this.expandedQuestions.update((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }
  protected questionOpen(key: string): boolean { return this.expandedQuestions().has(key); }
  protected helpQuestionKey(category: HelpCategory, question: HelpQuestion): string { return `${category.id}:${question.question}`; }
}
