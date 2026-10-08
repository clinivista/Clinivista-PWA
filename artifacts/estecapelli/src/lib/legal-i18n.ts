import type { LangCode } from "./language";

// Política de privacidad y términos de servicio en los nueve idiomas de la aplicación.
// "{email}" se muestra como enlace al correo de contacto y "{privacy}" como enlace a la política de privacidad.
export type LegalSection = { h: string; p?: string[]; ul?: string[]; after?: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };
export type LegalText = {
  company: string;
  updated: string;
  privacyLinkText: string;
  docsNav: string;
  privacy: LegalDoc;
  terms: LegalDoc;
};

export const LEGAL_TEXT: Record<LangCode, LegalText> = {
  es: {
    company: "Clinivista", updated: "Última actualización", privacyLinkText: "política de privacidad", docsNav: "Documentos legales",
    privacy: {
      title: "Política de privacidad",
      intro: "Clinivista es una plataforma que las clínicas usan para recibir las fotografías y los datos de sus pacientes, evaluarlos y enviarles sus resultados. Esta política explica qué datos se recogen, para qué se usan y cuáles son tus derechos.",
      sections: [
        { h: "Quién es responsable de tus datos", p: ["La clínica a la que le envías tu evaluación es la responsable de tus datos clínicos y decide para qué se usan. Clinivista actúa por encargo de esa clínica: almacena y procesa los datos solo para prestarle el servicio, y no los usa para otros fines."] },
        { h: "Qué datos recogemos", ul: [
          "Datos de identificación y contacto: nombre, RUT, teléfono, correo electrónico, edad y ciudad.",
          "Datos de salud que tú entregas: antecedentes, síntomas y las fotografías que subes en tu evaluación.",
          "El diagnóstico y la respuesta que el equipo médico de la clínica prepara para ti, incluidas las fotografías con sus indicaciones.",
          "Si entras con Google: solo tu nombre y tu correo verificado. No accedemos a tu correo, contactos, archivos ni a ningún otro dato de tu cuenta de Google.",
          "Datos técnicos mínimos necesarios para el funcionamiento y la seguridad del servicio (por ejemplo, registros de acceso)."] },
        { h: "Para qué los usamos", ul: [
          "Que la clínica evalúe tu caso y te responda.",
          "Enviarte tus resultados por correo, por WhatsApp o mediante tu cuenta.",
          "Crear y proteger tu cuenta, para que solo tú veas tus resultados.",
          "Mantener la seguridad del servicio y cumplir obligaciones legales."],
          after: ["Solo te contactaremos con fines comerciales si lo autorizaste expresamente al registrarte."] },
        { h: "Con quién se comparten", p: [
          "No vendemos tus datos. Pueden acceder a ellos el equipo autorizado de la clínica que te atiende y los proveedores técnicos que permiten que el servicio funcione: alojamiento de la aplicación y base de datos, almacenamiento privado de fotografías, envío de correos y acceso con Google. Estos proveedores solo procesan los datos para prestar su servicio.",
          "Los resultados se envían a través del medio que elijas. Quien tenga el enlace que te enviamos puede abrir tu informe, así que no lo compartas. Los enlaces vencen a los 30 días; en tu cuenta puedes volver a descargarlos."] },
        { h: "Cómo los protegemos", p: ["Las fotografías se guardan en almacenamiento privado, la comunicación viaja cifrada y el acceso del personal requiere una cuenta autorizada que solo ve los pacientes de su propia clínica. Ningún sistema es infalible, pero aplicamos medidas razonables para reducir los riesgos."] },
        { h: "Cuánto tiempo los conservamos", p: ["Los datos se conservan mientras la clínica los necesite para tu atención y para cumplir sus obligaciones, o hasta que se eliminen a tu solicitud, cuando la ley lo permita."] },
        { h: "Tus derechos", p: ["Puedes pedir acceso a tus datos, su rectificación, su eliminación y oponerte a ciertos usos, de acuerdo con la Ley N.º 19.628 sobre protección de la vida privada y las normas que la reemplacen. Escribe a la clínica que te atiende o a {email}, y gestionaremos tu solicitud con la clínica."] },
        { h: "Cambios en esta política", p: ["Si la actualizamos, publicaremos aquí la nueva versión con su fecha."] },
      ],
    },
    terms: {
      title: "Términos de servicio",
      intro: "Al usar Clinivista aceptas estos términos. Si no estás de acuerdo, no uses el servicio.",
      sections: [
        { h: "El servicio", p: ["Clinivista permite a una clínica recibir tus fotografías y datos, evaluarlos y enviarte una respuesta. Tú envías tu evaluación a una clínica determinada y es ella quien te atiende; Clinivista solo provee la plataforma."] },
        { h: "No es una consulta médica de urgencia", p: ["La respuesta que recibes se basa en las fotografías y los datos que enviaste y no reemplaza una consulta presencial. Para confirmar el diagnóstico y definir un tratamiento, la clínica puede pedirte una evaluación en persona. Si tienes una urgencia médica, acude a un servicio de urgencia."] },
        { h: "Tu cuenta y tus datos", ul: [
          "Debes ser mayor de edad y entregar información verdadera.",
          "Eres responsable de mantener segura tu clave o tu cuenta de Google, y de no compartir los enlaces con tus resultados.",
          "Debes enviar solo fotografías tuyas, o de una persona que te haya autorizado."] },
        { h: "Uso adecuado", p: ["No puedes usar el servicio para fines ilegales, intentar acceder a datos de otras personas, ni interferir con su funcionamiento. Podemos suspender cuentas que incumplan estos términos."] },
        { h: "Privacidad", p: ["El tratamiento de tus datos se explica en la {privacy}."] },
        { h: "Responsabilidad", p: ["Hacemos lo razonable para que el servicio funcione de forma continua y segura, pero no garantizamos que esté libre de interrupciones. Las decisiones médicas y su resultado son responsabilidad de la clínica y de sus profesionales."] },
        { h: "Propiedad intelectual", p: ["La plataforma y su marca pertenecen a Clinivista. Tus fotografías y datos siguen siendo tuyos; nos autorizas, a nosotros y a la clínica que elijas, a usarlos para prestar el servicio descrito."] },
        { h: "Cambios y ley aplicable", p: ["Podemos actualizar estos términos y publicaremos aquí la versión vigente. Se rigen por las leyes de Chile. Para consultas, escribe a {email}."] },
      ],
    },
  },
  en: {
    company: "Clinivista", updated: "Last updated", privacyLinkText: "privacy policy", docsNav: "Legal documents",
    privacy: {
      title: "Privacy policy",
      intro: "Clinivista is a platform that clinics use to receive their patients' photographs and data, evaluate them and send them their results. This policy explains what data is collected, what it is used for and what your rights are.",
      sections: [
        { h: "Who is responsible for your data", p: ["The clinic you send your evaluation to is responsible for your clinical data and decides what it is used for. Clinivista acts on behalf of that clinic: it stores and processes the data only to provide the service to it, and does not use it for any other purpose."] },
        { h: "What data we collect", ul: [
          "Identification and contact data: name, national ID (RUT), phone, email, age and city.",
          "Health data you provide: history, symptoms and the photographs you upload in your evaluation.",
          "The diagnosis and reply the clinic's medical team prepares for you, including photographs with their markings.",
          "If you sign in with Google: only your name and verified email. We do not access your email, contacts, files or any other data of your Google account.",
          "Minimal technical data needed for the service to work and stay secure (for example, access logs)."] },
        { h: "What we use it for", ul: [
          "So the clinic can evaluate your case and reply to you.",
          "To send you your results by email, WhatsApp or through your account.",
          "To create and protect your account, so that only you can see your results.",
          "To keep the service secure and meet legal obligations."],
          after: ["We will only contact you for commercial purposes if you expressly authorized it when registering."] },
        { h: "Who it is shared with", p: [
          "We do not sell your data. The authorized team of the clinic treating you and the technical providers that make the service work can access it: application and database hosting, private photograph storage, email delivery and Google sign-in. These providers only process the data to provide their service.",
          "Results are sent through the channel you choose. Anyone with the link we send you can open your report, so do not share it. Links expire after 30 days; you can download them again from your account."] },
        { h: "How we protect it", p: ["Photographs are kept in private storage, communication is encrypted, and staff access requires an authorized account that only sees the patients of its own clinic. No system is infallible, but we apply reasonable measures to reduce risks."] },
        { h: "How long we keep it", p: ["Data is kept for as long as the clinic needs it for your care and to meet its obligations, or until it is deleted at your request, where the law allows."] },
        { h: "Your rights", p: ["You can ask for access to your data, its correction and deletion, and object to certain uses, in accordance with Chilean Law No. 19.628 on the protection of privacy and the rules that replace it. Write to the clinic treating you or to {email}, and we will handle your request together with the clinic."] },
        { h: "Changes to this policy", p: ["If we update it, we will publish the new version here with its date."] },
      ],
    },
    terms: {
      title: "Terms of service",
      intro: "By using Clinivista you accept these terms. If you do not agree, do not use the service.",
      sections: [
        { h: "The service", p: ["Clinivista lets a clinic receive your photographs and data, evaluate them and send you a reply. You send your evaluation to a specific clinic and it is the clinic that treats you; Clinivista only provides the platform."] },
        { h: "This is not an emergency medical consultation", p: ["The reply you receive is based on the photographs and data you sent and does not replace an in-person consultation. To confirm the diagnosis and define a treatment, the clinic may ask you for an in-person evaluation. If you have a medical emergency, go to an emergency service."] },
        { h: "Your account and your data", ul: [
          "You must be of legal age and provide truthful information.",
          "You are responsible for keeping your password or Google account secure, and for not sharing the links to your results.",
          "You must only send photographs of yourself, or of a person who has authorized you."] },
        { h: "Proper use", p: ["You may not use the service for illegal purposes, try to access other people's data or interfere with its operation. We may suspend accounts that breach these terms."] },
        { h: "Privacy", p: ["How your data is handled is explained in the {privacy}."] },
        { h: "Liability", p: ["We do what is reasonable to keep the service running continuously and securely, but we do not guarantee it is free of interruptions. Medical decisions and their outcome are the responsibility of the clinic and its professionals."] },
        { h: "Intellectual property", p: ["The platform and its brand belong to Clinivista. Your photographs and data remain yours; you authorize us, and the clinic you choose, to use them to provide the service described."] },
        { h: "Changes and governing law", p: ["We may update these terms and will publish the current version here. They are governed by the laws of Chile. For questions, write to {email}."] },
      ],
    },
  },
  pt: {
    company: "Clinivista", updated: "Última atualização", privacyLinkText: "política de privacidade", docsNav: "Documentos legais",
    privacy: {
      title: "Política de privacidade",
      intro: "A Clinivista é uma plataforma que as clínicas usam para receber as fotografias e os dados de seus pacientes, avaliá-los e enviar-lhes os resultados. Esta política explica quais dados são coletados, para que são usados e quais são os seus direitos.",
      sections: [
        { h: "Quem é responsável pelos seus dados", p: ["A clínica para a qual você envia a sua avaliação é a responsável pelos seus dados clínicos e decide para que são usados. A Clinivista atua por conta dessa clínica: armazena e processa os dados apenas para lhe prestar o serviço e não os usa para outros fins."] },
        { h: "Quais dados coletamos", ul: [
          "Dados de identificação e contato: nome, documento de identidade (RUT), telefone, e-mail, idade e cidade.",
          "Dados de saúde que você fornece: antecedentes, sintomas e as fotografias que envia na sua avaliação.",
          "O diagnóstico e a resposta que a equipe médica da clínica prepara para você, incluindo as fotografias com as suas indicações.",
          "Se você entrar com o Google: apenas o seu nome e o seu e-mail verificado. Não acessamos o seu e-mail, contatos, arquivos nem qualquer outro dado da sua conta do Google.",
          "Dados técnicos mínimos necessários para o funcionamento e a segurança do serviço (por exemplo, registros de acesso)."] },
        { h: "Para que os usamos", ul: [
          "Para que a clínica avalie o seu caso e responda a você.",
          "Para enviar os seus resultados por e-mail, por WhatsApp ou pela sua conta.",
          "Para criar e proteger a sua conta, de modo que só você veja os seus resultados.",
          "Para manter a segurança do serviço e cumprir obrigações legais."],
          after: ["Só entraremos em contato com fins comerciais se você tiver autorizado expressamente ao se cadastrar."] },
        { h: "Com quem são compartilhados", p: [
          "Não vendemos os seus dados. Podem acessá-los a equipe autorizada da clínica que atende você e os provedores técnicos que fazem o serviço funcionar: hospedagem do aplicativo e do banco de dados, armazenamento privado de fotografias, envio de e-mails e acesso com o Google. Esses provedores só processam os dados para prestar o seu serviço.",
          "Os resultados são enviados pelo meio que você escolher. Quem tiver o link que enviamos pode abrir o seu relatório, portanto não o compartilhe. Os links expiram em 30 dias; na sua conta você pode baixá-los novamente."] },
        { h: "Como os protegemos", p: ["As fotografias ficam em armazenamento privado, a comunicação é criptografada e o acesso da equipe exige uma conta autorizada que só vê os pacientes da própria clínica. Nenhum sistema é infalível, mas aplicamos medidas razoáveis para reduzir os riscos."] },
        { h: "Por quanto tempo os conservamos", p: ["Os dados são conservados enquanto a clínica precisar deles para o seu atendimento e para cumprir suas obrigações, ou até serem eliminados a seu pedido, quando a lei permitir."] },
        { h: "Seus direitos", p: ["Você pode solicitar acesso aos seus dados, retificação e eliminação, e se opor a certos usos, de acordo com a Lei chilena n.º 19.628 sobre proteção da vida privada e as normas que a substituam. Escreva à clínica que atende você ou para {email}, e trataremos o seu pedido junto com a clínica."] },
        { h: "Alterações nesta política", p: ["Se a atualizarmos, publicaremos aqui a nova versão com a sua data."] },
      ],
    },
    terms: {
      title: "Termos de serviço",
      intro: "Ao usar a Clinivista, você aceita estes termos. Se não concordar, não use o serviço.",
      sections: [
        { h: "O serviço", p: ["A Clinivista permite que uma clínica receba as suas fotografias e dados, avalie-os e envie uma resposta a você. Você envia a sua avaliação a uma clínica determinada e é ela quem atende você; a Clinivista apenas fornece a plataforma."] },
        { h: "Não é uma consulta médica de urgência", p: ["A resposta que você recebe baseia-se nas fotografias e nos dados que enviou e não substitui uma consulta presencial. Para confirmar o diagnóstico e definir um tratamento, a clínica pode pedir uma avaliação presencial. Em caso de urgência médica, procure um serviço de urgência."] },
        { h: "Sua conta e seus dados", ul: [
          "Você deve ser maior de idade e fornecer informações verdadeiras.",
          "Você é responsável por manter segura a sua senha ou a sua conta do Google e por não compartilhar os links com os seus resultados.",
          "Você deve enviar apenas fotografias suas ou de uma pessoa que tenha autorizado você."] },
        { h: "Uso adequado", p: ["Você não pode usar o serviço para fins ilegais, tentar acessar dados de outras pessoas nem interferir no seu funcionamento. Podemos suspender contas que descumpram estes termos."] },
        { h: "Privacidade", p: ["O tratamento dos seus dados é explicado na {privacy}."] },
        { h: "Responsabilidade", p: ["Fazemos o razoável para que o serviço funcione de forma contínua e segura, mas não garantimos que esteja livre de interrupções. As decisões médicas e o seu resultado são de responsabilidade da clínica e de seus profissionais."] },
        { h: "Propriedade intelectual", p: ["A plataforma e a sua marca pertencem à Clinivista. Suas fotografias e dados continuam sendo seus; você nos autoriza, bem como à clínica que escolher, a usá-los para prestar o serviço descrito."] },
        { h: "Alterações e lei aplicável", p: ["Podemos atualizar estes termos e publicaremos aqui a versão vigente. Eles são regidos pelas leis do Chile. Em caso de dúvidas, escreva para {email}."] },
      ],
    },
  },
  fr: {
    company: "Clinivista", updated: "Dernière mise à jour", privacyLinkText: "politique de confidentialité", docsNav: "Documents juridiques",
    privacy: {
      title: "Politique de confidentialité",
      intro: "Clinivista est une plateforme que les cliniques utilisent pour recevoir les photographies et les données de leurs patients, les évaluer et leur envoyer leurs résultats. Cette politique explique quelles données sont collectées, à quoi elles servent et quels sont vos droits.",
      sections: [
        { h: "Qui est responsable de vos données", p: ["La clinique à laquelle vous envoyez votre évaluation est responsable de vos données cliniques et décide de leur utilisation. Clinivista agit pour le compte de cette clinique : elle stocke et traite les données uniquement pour lui fournir le service, et ne les utilise à aucune autre fin."] },
        { h: "Quelles données nous collectons", ul: [
          "Données d'identification et de contact : nom, numéro d'identité (RUT), téléphone, e-mail, âge et ville.",
          "Données de santé que vous fournissez : antécédents, symptômes et photographies que vous envoyez lors de votre évaluation.",
          "Le diagnostic et la réponse que l'équipe médicale de la clinique prépare pour vous, y compris les photographies annotées.",
          "Si vous vous connectez avec Google : uniquement votre nom et votre e-mail vérifié. Nous n'accédons ni à votre messagerie, ni à vos contacts, ni à vos fichiers, ni à aucune autre donnée de votre compte Google.",
          "Les données techniques minimales nécessaires au fonctionnement et à la sécurité du service (par exemple, les journaux d'accès)."] },
        { h: "À quoi elles servent", ul: [
          "Permettre à la clinique d'évaluer votre cas et de vous répondre.",
          "Vous envoyer vos résultats par e-mail, par WhatsApp ou via votre compte.",
          "Créer et protéger votre compte, afin que vous seul puissiez voir vos résultats.",
          "Assurer la sécurité du service et respecter les obligations légales."],
          after: ["Nous ne vous contacterons à des fins commerciales que si vous l'avez expressément autorisé lors de votre inscription."] },
        { h: "Avec qui elles sont partagées", p: [
          "Nous ne vendons pas vos données. L'équipe autorisée de la clinique qui vous prend en charge et les prestataires techniques qui font fonctionner le service peuvent y accéder : hébergement de l'application et de la base de données, stockage privé des photographies, envoi d'e-mails et connexion avec Google. Ces prestataires ne traitent les données que pour fournir leur service.",
          "Les résultats sont envoyés par le moyen que vous choisissez. Toute personne disposant du lien que nous vous envoyons peut ouvrir votre rapport ; ne le partagez donc pas. Les liens expirent au bout de 30 jours ; vous pouvez les télécharger à nouveau depuis votre compte."] },
        { h: "Comment nous les protégeons", p: ["Les photographies sont conservées dans un stockage privé, les communications sont chiffrées et l'accès du personnel exige un compte autorisé qui ne voit que les patients de sa propre clinique. Aucun système n'est infaillible, mais nous appliquons des mesures raisonnables pour réduire les risques."] },
        { h: "Combien de temps nous les conservons", p: ["Les données sont conservées tant que la clinique en a besoin pour votre prise en charge et pour respecter ses obligations, ou jusqu'à leur suppression à votre demande, lorsque la loi le permet."] },
        { h: "Vos droits", p: ["Vous pouvez demander l'accès à vos données, leur rectification et leur suppression, et vous opposer à certains usages, conformément à la loi chilienne n° 19.628 sur la protection de la vie privée et aux textes qui la remplaceront. Écrivez à la clinique qui vous prend en charge ou à {email}, et nous traiterons votre demande avec la clinique."] },
        { h: "Modifications de cette politique", p: ["Si nous la mettons à jour, nous publierons ici la nouvelle version avec sa date."] },
      ],
    },
    terms: {
      title: "Conditions d'utilisation",
      intro: "En utilisant Clinivista, vous acceptez ces conditions. Si vous n'êtes pas d'accord, n'utilisez pas le service.",
      sections: [
        { h: "Le service", p: ["Clinivista permet à une clinique de recevoir vos photographies et vos données, de les évaluer et de vous envoyer une réponse. Vous envoyez votre évaluation à une clinique déterminée et c'est elle qui vous prend en charge ; Clinivista ne fournit que la plateforme."] },
        { h: "Ce n'est pas une consultation médicale d'urgence", p: ["La réponse que vous recevez repose sur les photographies et les données que vous avez envoyées et ne remplace pas une consultation en personne. Pour confirmer le diagnostic et définir un traitement, la clinique peut vous demander une évaluation en personne. En cas d'urgence médicale, rendez-vous dans un service d'urgence."] },
        { h: "Votre compte et vos données", ul: [
          "Vous devez être majeur et fournir des informations exactes.",
          "Vous êtes responsable de la sécurité de votre mot de passe ou de votre compte Google, et de ne pas partager les liens vers vos résultats.",
          "Vous ne devez envoyer que des photographies de vous-même, ou d'une personne qui vous y a autorisé."] },
        { h: "Utilisation appropriée", p: ["Vous ne pouvez pas utiliser le service à des fins illégales, tenter d'accéder aux données d'autres personnes ni perturber son fonctionnement. Nous pouvons suspendre les comptes qui ne respectent pas ces conditions."] },
        { h: "Confidentialité", p: ["Le traitement de vos données est expliqué dans la {privacy}."] },
        { h: "Responsabilité", p: ["Nous faisons le nécessaire pour que le service fonctionne de manière continue et sûre, mais nous ne garantissons pas l'absence d'interruptions. Les décisions médicales et leur résultat relèvent de la responsabilité de la clinique et de ses professionnels."] },
        { h: "Propriété intellectuelle", p: ["La plateforme et sa marque appartiennent à Clinivista. Vos photographies et vos données restent les vôtres ; vous nous autorisez, ainsi que la clinique de votre choix, à les utiliser pour fournir le service décrit."] },
        { h: "Modifications et droit applicable", p: ["Nous pouvons mettre à jour ces conditions et publierons ici la version en vigueur. Elles sont régies par le droit chilien. Pour toute question, écrivez à {email}."] },
      ],
    },
  },
  de: {
    company: "Clinivista", updated: "Zuletzt aktualisiert", privacyLinkText: "Datenschutzerklärung", docsNav: "Rechtliche Dokumente",
    privacy: {
      title: "Datenschutzerklärung",
      intro: "Clinivista ist eine Plattform, die Kliniken nutzen, um Fotos und Daten ihrer Patienten zu empfangen, auszuwerten und ihnen ihre Ergebnisse zu senden. Diese Erklärung beschreibt, welche Daten erhoben werden, wofür sie verwendet werden und welche Rechte Sie haben.",
      sections: [
        { h: "Wer für Ihre Daten verantwortlich ist", p: ["Die Klinik, an die Sie Ihre Untersuchung senden, ist für Ihre klinischen Daten verantwortlich und entscheidet über deren Verwendung. Clinivista handelt im Auftrag dieser Klinik: Es speichert und verarbeitet die Daten nur, um ihr den Dienst zu erbringen, und verwendet sie für keine anderen Zwecke."] },
        { h: "Welche Daten wir erheben", ul: [
          "Identifikations- und Kontaktdaten: Name, Ausweisnummer (RUT), Telefon, E-Mail, Alter und Stadt.",
          "Gesundheitsdaten, die Sie angeben: Vorgeschichte, Symptome und die Fotos, die Sie bei Ihrer Untersuchung hochladen.",
          "Die Diagnose und die Antwort, die das medizinische Team der Klinik für Sie erstellt, einschließlich der Fotos mit Markierungen.",
          "Wenn Sie sich mit Google anmelden: nur Ihr Name und Ihre verifizierte E-Mail-Adresse. Wir greifen weder auf Ihre E-Mails, Kontakte oder Dateien noch auf andere Daten Ihres Google-Kontos zu.",
          "Minimale technische Daten, die für Betrieb und Sicherheit des Dienstes nötig sind (z. B. Zugriffsprotokolle)."] },
        { h: "Wofür wir sie verwenden", ul: [
          "Damit die Klinik Ihren Fall beurteilen und Ihnen antworten kann.",
          "Um Ihnen Ihre Ergebnisse per E-Mail, WhatsApp oder über Ihr Konto zu senden.",
          "Um Ihr Konto einzurichten und zu schützen, damit nur Sie Ihre Ergebnisse sehen.",
          "Um die Sicherheit des Dienstes zu gewährleisten und gesetzliche Pflichten zu erfüllen."],
          after: ["Wir kontaktieren Sie nur zu Werbezwecken, wenn Sie bei der Registrierung ausdrücklich zugestimmt haben."] },
        { h: "Mit wem sie geteilt werden", p: [
          "Wir verkaufen Ihre Daten nicht. Zugriff haben das autorisierte Team der Klinik, die Sie betreut, sowie die technischen Dienstleister, die den Dienst ermöglichen: Hosting von Anwendung und Datenbank, privater Fotospeicher, E-Mail-Versand und Anmeldung mit Google. Diese Dienstleister verarbeiten die Daten nur, um ihren Dienst zu erbringen.",
          "Die Ergebnisse werden über den von Ihnen gewählten Weg gesendet. Wer den Link besitzt, den wir Ihnen senden, kann Ihren Bericht öffnen – geben Sie ihn daher nicht weiter. Links laufen nach 30 Tagen ab; in Ihrem Konto können Sie sie erneut herunterladen."] },
        { h: "Wie wir sie schützen", p: ["Fotos werden in einem privaten Speicher abgelegt, die Kommunikation ist verschlüsselt, und der Zugriff des Personals erfordert ein autorisiertes Konto, das nur die Patienten der eigenen Klinik sieht. Kein System ist unfehlbar, aber wir ergreifen angemessene Maßnahmen, um Risiken zu verringern."] },
        { h: "Wie lange wir sie aufbewahren", p: ["Die Daten werden so lange aufbewahrt, wie die Klinik sie für Ihre Betreuung und zur Erfüllung ihrer Pflichten benötigt, oder bis sie auf Ihren Wunsch gelöscht werden, sofern das Gesetz es erlaubt."] },
        { h: "Ihre Rechte", p: ["Sie können Auskunft über Ihre Daten sowie deren Berichtigung und Löschung verlangen und bestimmten Verwendungen widersprechen, gemäß dem chilenischen Gesetz Nr. 19.628 zum Schutz der Privatsphäre und den Vorschriften, die es ersetzen. Schreiben Sie an die Klinik, die Sie betreut, oder an {email}; wir bearbeiten Ihre Anfrage gemeinsam mit der Klinik."] },
        { h: "Änderungen dieser Erklärung", p: ["Wenn wir sie aktualisieren, veröffentlichen wir hier die neue Fassung mit Datum."] },
      ],
    },
    terms: {
      title: "Nutzungsbedingungen",
      intro: "Mit der Nutzung von Clinivista akzeptieren Sie diese Bedingungen. Wenn Sie nicht einverstanden sind, nutzen Sie den Dienst nicht.",
      sections: [
        { h: "Der Dienst", p: ["Clinivista ermöglicht einer Klinik, Ihre Fotos und Daten zu empfangen, auszuwerten und Ihnen zu antworten. Sie senden Ihre Untersuchung an eine bestimmte Klinik, und diese betreut Sie; Clinivista stellt nur die Plattform bereit."] },
        { h: "Dies ist keine ärztliche Notfallberatung", p: ["Die Antwort, die Sie erhalten, beruht auf den Fotos und Daten, die Sie gesendet haben, und ersetzt keine Untersuchung vor Ort. Zur Bestätigung der Diagnose und zur Festlegung einer Behandlung kann die Klinik eine Untersuchung vor Ort verlangen. Bei einem medizinischen Notfall suchen Sie eine Notaufnahme auf."] },
        { h: "Ihr Konto und Ihre Daten", ul: [
          "Sie müssen volljährig sein und wahrheitsgemäße Angaben machen.",
          "Sie sind dafür verantwortlich, Ihr Passwort oder Ihr Google-Konto sicher zu halten und die Links zu Ihren Ergebnissen nicht weiterzugeben.",
          "Sie dürfen nur Fotos von sich selbst oder von einer Person senden, die Sie dazu ermächtigt hat."] },
        { h: "Angemessene Nutzung", p: ["Sie dürfen den Dienst nicht für rechtswidrige Zwecke nutzen, nicht versuchen, auf Daten anderer Personen zuzugreifen, und den Betrieb nicht stören. Wir können Konten sperren, die gegen diese Bedingungen verstoßen."] },
        { h: "Datenschutz", p: ["Wie Ihre Daten verarbeitet werden, ist in der {privacy} beschrieben."] },
        { h: "Haftung", p: ["Wir tun das Zumutbare, damit der Dienst kontinuierlich und sicher läuft, garantieren jedoch keine unterbrechungsfreie Verfügbarkeit. Für medizinische Entscheidungen und deren Ergebnis sind die Klinik und ihre Fachkräfte verantwortlich."] },
        { h: "Geistiges Eigentum", p: ["Die Plattform und ihre Marke gehören Clinivista. Ihre Fotos und Daten bleiben Ihr Eigentum; Sie ermächtigen uns und die von Ihnen gewählte Klinik, sie zur Erbringung des beschriebenen Dienstes zu verwenden."] },
        { h: "Änderungen und anwendbares Recht", p: ["Wir können diese Bedingungen aktualisieren und veröffentlichen hier die gültige Fassung. Es gilt chilenisches Recht. Bei Fragen schreiben Sie an {email}."] },
      ],
    },
  },
  it: {
    company: "Clinivista", updated: "Ultimo aggiornamento", privacyLinkText: "informativa sulla privacy", docsNav: "Documenti legali",
    privacy: {
      title: "Informativa sulla privacy",
      intro: "Clinivista è una piattaforma che le cliniche usano per ricevere le fotografie e i dati dei loro pazienti, valutarli e inviare i risultati. Questa informativa spiega quali dati vengono raccolti, per quali scopi e quali sono i tuoi diritti.",
      sections: [
        { h: "Chi è responsabile dei tuoi dati", p: ["La clinica a cui invii la tua valutazione è responsabile dei tuoi dati clinici e decide come vengono usati. Clinivista agisce per conto di quella clinica: conserva ed elabora i dati solo per fornirle il servizio e non li usa per altri scopi."] },
        { h: "Quali dati raccogliamo", ul: [
          "Dati identificativi e di contatto: nome, documento d'identità (RUT), telefono, e-mail, età e città.",
          "Dati sanitari che fornisci: anamnesi, sintomi e le fotografie che carichi nella valutazione.",
          "La diagnosi e la risposta che il team medico della clinica prepara per te, comprese le fotografie con le sue indicazioni.",
          "Se accedi con Google: solo il tuo nome e la tua e-mail verificata. Non accediamo alla tua posta, ai contatti, ai file né ad altri dati del tuo account Google.",
          "Dati tecnici minimi necessari al funzionamento e alla sicurezza del servizio (ad esempio, i registri di accesso)."] },
        { h: "Per quali scopi li usiamo", ul: [
          "Perché la clinica valuti il tuo caso e ti risponda.",
          "Per inviarti i risultati via e-mail, WhatsApp o tramite il tuo account.",
          "Per creare e proteggere il tuo account, in modo che solo tu veda i tuoi risultati.",
          "Per mantenere la sicurezza del servizio e adempiere agli obblighi di legge."],
          after: ["Ti contatteremo a scopo commerciale solo se lo hai autorizzato espressamente al momento della registrazione."] },
        { h: "Con chi vengono condivisi", p: [
          "Non vendiamo i tuoi dati. Possono accedervi il personale autorizzato della clinica che ti segue e i fornitori tecnici che permettono il funzionamento del servizio: hosting dell'applicazione e del database, archiviazione privata delle fotografie, invio di e-mail e accesso con Google. Questi fornitori trattano i dati solo per erogare il proprio servizio.",
          "I risultati vengono inviati tramite il canale che scegli. Chiunque abbia il link che ti inviamo può aprire il tuo referto, quindi non condividerlo. I link scadono dopo 30 giorni; nel tuo account puoi scaricarli di nuovo."] },
        { h: "Come li proteggiamo", p: ["Le fotografie sono conservate in uno spazio privato, la comunicazione è cifrata e l'accesso del personale richiede un account autorizzato che vede solo i pazienti della propria clinica. Nessun sistema è infallibile, ma applichiamo misure ragionevoli per ridurre i rischi."] },
        { h: "Per quanto tempo li conserviamo", p: ["I dati sono conservati finché la clinica ne ha bisogno per assisterti e per adempiere ai suoi obblighi, o fino alla cancellazione su tua richiesta, quando la legge lo consente."] },
        { h: "I tuoi diritti", p: ["Puoi chiedere l'accesso ai tuoi dati, la loro rettifica e cancellazione e opporti a determinati usi, in conformità alla legge cilena n. 19.628 sulla protezione della vita privata e alle norme che la sostituiranno. Scrivi alla clinica che ti segue o a {email} e gestiremo la tua richiesta insieme alla clinica."] },
        { h: "Modifiche a questa informativa", p: ["Se la aggiorniamo, pubblicheremo qui la nuova versione con la data."] },
      ],
    },
    terms: {
      title: "Termini di servizio",
      intro: "Usando Clinivista accetti questi termini. Se non sei d'accordo, non usare il servizio.",
      sections: [
        { h: "Il servizio", p: ["Clinivista permette a una clinica di ricevere le tue fotografie e i tuoi dati, valutarli e inviarti una risposta. Tu invii la tua valutazione a una clinica determinata ed è essa a seguirti; Clinivista fornisce solo la piattaforma."] },
        { h: "Non è una visita medica d'urgenza", p: ["La risposta che ricevi si basa sulle fotografie e sui dati che hai inviato e non sostituisce una visita in presenza. Per confermare la diagnosi e definire una terapia, la clinica può chiederti una valutazione di persona. In caso di urgenza medica, rivolgiti a un pronto soccorso."] },
        { h: "Il tuo account e i tuoi dati", ul: [
          "Devi essere maggiorenne e fornire informazioni veritiere.",
          "Sei responsabile di mantenere al sicuro la tua password o il tuo account Google e di non condividere i link ai tuoi risultati.",
          "Devi inviare solo fotografie tue o di una persona che ti abbia autorizzato."] },
        { h: "Uso corretto", p: ["Non puoi usare il servizio per scopi illeciti, cercare di accedere ai dati di altre persone né interferire con il suo funzionamento. Possiamo sospendere gli account che violano questi termini."] },
        { h: "Privacy", p: ["Il trattamento dei tuoi dati è spiegato nell'{privacy}."] },
        { h: "Responsabilità", p: ["Facciamo quanto ragionevole perché il servizio funzioni in modo continuo e sicuro, ma non garantiamo che sia privo di interruzioni. Le decisioni mediche e il loro esito sono responsabilità della clinica e dei suoi professionisti."] },
        { h: "Proprietà intellettuale", p: ["La piattaforma e il suo marchio appartengono a Clinivista. Le tue fotografie e i tuoi dati restano tuoi; autorizzi noi e la clinica che scegli a usarli per fornire il servizio descritto."] },
        { h: "Modifiche e legge applicabile", p: ["Possiamo aggiornare questi termini e pubblicheremo qui la versione vigente. Sono regolati dalle leggi del Cile. Per domande, scrivi a {email}."] },
      ],
    },
  },
  tr: {
    company: "Clinivista", updated: "Son güncelleme", privacyLinkText: "gizlilik politikası", docsNav: "Yasal belgeler",
    privacy: {
      title: "Gizlilik politikası",
      intro: "Clinivista, kliniklerin hastalarının fotoğraflarını ve verilerini almak, değerlendirmek ve sonuçlarını göndermek için kullandığı bir platformdur. Bu politika hangi verilerin toplandığını, ne için kullanıldığını ve haklarınızın neler olduğunu açıklar.",
      sections: [
        { h: "Verilerinizden kim sorumludur", p: ["Değerlendirmenizi gönderdiğiniz klinik, klinik verilerinizden sorumludur ve bunların ne için kullanılacağına karar verir. Clinivista bu kliniğin adına hareket eder: verileri yalnızca ona hizmet sunmak için saklar ve işler, başka hiçbir amaçla kullanmaz."] },
        { h: "Hangi verileri topluyoruz", ul: [
          "Kimlik ve iletişim verileri: ad, kimlik numarası (RUT), telefon, e-posta, yaş ve şehir.",
          "Sizin verdiğiniz sağlık verileri: öykü, belirtiler ve değerlendirmenizde yüklediğiniz fotoğraflar.",
          "Kliniğin tıbbi ekibinin sizin için hazırladığı tanı ve yanıt, işaretlemeli fotoğraflar dahil.",
          "Google ile giriş yaparsanız: yalnızca adınız ve doğrulanmış e-postanız. E-postalarınıza, kişilerinize, dosyalarınıza veya Google hesabınızın başka hiçbir verisine erişmeyiz.",
          "Hizmetin çalışması ve güvenliği için gereken asgari teknik veriler (örneğin erişim kayıtları)."] },
        { h: "Ne için kullanıyoruz", ul: [
          "Kliniğin durumunuzu değerlendirip size yanıt verebilmesi için.",
          "Sonuçlarınızı e-posta, WhatsApp veya hesabınız üzerinden göndermek için.",
          "Hesabınızı oluşturmak ve korumak, sonuçlarınızı yalnızca sizin görmeniz için.",
          "Hizmetin güvenliğini sağlamak ve yasal yükümlülükleri yerine getirmek için."],
          after: ["Sizinle ticari amaçla yalnızca kayıt sırasında açıkça izin verdiyseniz iletişime geçeriz."] },
        { h: "Kimlerle paylaşılır", p: [
          "Verilerinizi satmayız. Verilere sizi takip eden kliniğin yetkili ekibi ile hizmetin çalışmasını sağlayan teknik sağlayıcılar erişebilir: uygulama ve veritabanı barındırma, özel fotoğraf depolama, e-posta gönderimi ve Google ile giriş. Bu sağlayıcılar verileri yalnızca kendi hizmetlerini sunmak için işler.",
          "Sonuçlar seçtiğiniz kanal üzerinden gönderilir. Size gönderdiğimiz bağlantıya sahip olan herkes raporunuzu açabilir, bu yüzden paylaşmayın. Bağlantılar 30 gün sonra geçerliliğini yitirir; hesabınızdan tekrar indirebilirsiniz."] },
        { h: "Nasıl koruyoruz", p: ["Fotoğraflar özel bir depolamada tutulur, iletişim şifrelidir ve personelin erişimi yalnızca kendi kliniğinin hastalarını gören yetkili bir hesap gerektirir. Hiçbir sistem kusursuz değildir, ancak riskleri azaltmak için makul önlemler uygularız."] },
        { h: "Ne kadar süre saklıyoruz", p: ["Veriler, klinik bunlara bakımınız ve yükümlülükleri için ihtiyaç duyduğu sürece veya yasanın izin verdiği durumlarda talebiniz üzerine silinene kadar saklanır."] },
        { h: "Haklarınız", p: ["Verilerinize erişim, düzeltme ve silme talep edebilir, belirli kullanımlara itiraz edebilirsiniz; bu, özel hayatın korunmasına ilişkin Şili 19.628 sayılı Kanun ve onun yerini alacak düzenlemeler uyarıncadır. Sizi takip eden kliniğe veya {email} adresine yazın; talebinizi klinikle birlikte ele alırız."] },
        { h: "Bu politikadaki değişiklikler", p: ["Güncellersek yeni sürümü tarihiyle birlikte burada yayımlarız."] },
      ],
    },
    terms: {
      title: "Hizmet şartları",
      intro: "Clinivista'yı kullanarak bu şartları kabul edersiniz. Kabul etmiyorsanız hizmeti kullanmayın.",
      sections: [
        { h: "Hizmet", p: ["Clinivista, bir kliniğin fotoğraflarınızı ve verilerinizi almasını, değerlendirmesini ve size yanıt göndermesini sağlar. Değerlendirmenizi belirli bir kliniğe gönderirsiniz ve sizi takip eden o kliniktir; Clinivista yalnızca platformu sağlar."] },
        { h: "Acil bir tıbbi muayene değildir", p: ["Aldığınız yanıt, gönderdiğiniz fotoğraf ve verilere dayanır ve yüz yüze muayenenin yerini tutmaz. Tanıyı doğrulamak ve tedaviyi belirlemek için klinik sizden yüz yüze değerlendirme isteyebilir. Tıbbi bir acil durumunuz varsa bir acil servise başvurun."] },
        { h: "Hesabınız ve verileriniz", ul: [
          "Reşit olmalı ve doğru bilgi vermelisiniz.",
          "Şifrenizi veya Google hesabınızı güvende tutmaktan ve sonuçlarınıza giden bağlantıları paylaşmamaktan siz sorumlusunuz.",
          "Yalnızca kendinize ait veya size yetki vermiş bir kişiye ait fotoğrafları göndermelisiniz."] },
        { h: "Uygun kullanım", p: ["Hizmeti yasa dışı amaçlarla kullanamaz, başkalarının verilerine erişmeye çalışamaz ve işleyişine müdahale edemezsiniz. Bu şartları ihlal eden hesapları askıya alabiliriz."] },
        { h: "Gizlilik", p: ["Verilerinizin nasıl işlendiği {privacy} içinde açıklanmıştır."] },
        { h: "Sorumluluk", p: ["Hizmetin kesintisiz ve güvenli çalışması için makul olanı yaparız, ancak kesintisiz olacağını garanti etmeyiz. Tıbbi kararlar ve sonuçları kliniğin ve uzmanlarının sorumluluğundadır."] },
        { h: "Fikri mülkiyet", p: ["Platform ve markası Clinivista'ya aittir. Fotoğraflarınız ve verileriniz size ait kalır; açıklanan hizmeti sunmak için bizi ve seçtiğiniz kliniği bunları kullanmaya yetkilendirirsiniz."] },
        { h: "Değişiklikler ve geçerli hukuk", p: ["Bu şartları güncelleyebiliriz ve geçerli sürümü burada yayımlarız. Şili yasalarına tabidir. Sorularınız için {email} adresine yazın."] },
      ],
    },
  },
  ar: {
    company: "Clinivista", updated: "آخر تحديث", privacyLinkText: "سياسة الخصوصية", docsNav: "الوثائق القانونية",
    privacy: {
      title: "سياسة الخصوصية",
      intro: "Clinivista منصة تستخدمها العيادات لاستقبال صور مرضاها وبياناتهم وتقييمها وإرسال النتائج إليهم. توضّح هذه السياسة ما البيانات التي تُجمع، ولأي غرض تُستخدم، وما حقوقك.",
      sections: [
        { h: "من المسؤول عن بياناتك", p: ["العيادة التي ترسل إليها تقييمك هي المسؤولة عن بياناتك السريرية وهي من يقرر كيفية استخدامها. تعمل Clinivista نيابةً عن تلك العيادة: تخزّن البيانات وتعالجها فقط لتقديم الخدمة لها، ولا تستخدمها لأي غرض آخر."] },
        { h: "ما البيانات التي نجمعها", ul: [
          "بيانات الهوية والتواصل: الاسم ورقم الهوية (RUT) والهاتف والبريد الإلكتروني والعمر والمدينة.",
          "البيانات الصحية التي تقدّمها: السوابق والأعراض والصور التي ترفعها في تقييمك.",
          "التشخيص والرد اللذان يعدّهما الفريق الطبي في العيادة لك، بما في ذلك الصور مع ملاحظاته.",
          "إذا دخلت باستخدام Google: اسمك وبريدك الإلكتروني الموثّق فقط. لا نصل إلى بريدك أو جهات اتصالك أو ملفاتك أو أي بيانات أخرى في حسابك على Google.",
          "الحد الأدنى من البيانات التقنية اللازمة لعمل الخدمة وأمنها (مثل سجلات الدخول)."] },
        { h: "لماذا نستخدمها", ul: [
          "لتتمكن العيادة من تقييم حالتك والرد عليك.",
          "لإرسال نتائجك بالبريد الإلكتروني أو عبر واتساب أو من خلال حسابك.",
          "لإنشاء حسابك وحمايته بحيث لا يرى نتائجك غيرك.",
          "للحفاظ على أمن الخدمة والوفاء بالالتزامات القانونية."],
          after: ["لن نتواصل معك لأغراض تجارية إلا إذا وافقت صراحةً على ذلك عند التسجيل."] },
        { h: "مع من تُشارَك", p: [
          "لا نبيع بياناتك. يمكن للفريق المخوّل في العيادة التي تعالجك ولمزوّدي الخدمات التقنية الذين يتيحون عمل الخدمة الوصول إليها: استضافة التطبيق وقاعدة البيانات، والتخزين الخاص للصور، وإرسال البريد الإلكتروني، والدخول باستخدام Google. لا يعالج هؤلاء المزوّدون البيانات إلا لتقديم خدمتهم.",
          "تُرسل النتائج عبر الوسيلة التي تختارها. يمكن لأي شخص يملك الرابط الذي نرسله إليك فتح تقريرك، لذا لا تشاركه. تنتهي صلاحية الروابط بعد 30 يومًا، ويمكنك تنزيلها من جديد من حسابك."] },
        { h: "كيف نحميها", p: ["تُحفظ الصور في تخزين خاص، والاتصال مشفّر، ويتطلب وصول الموظفين حسابًا مخوّلًا لا يرى إلا مرضى عيادته. لا يوجد نظام معصوم من الخطأ، لكننا نطبق إجراءات معقولة للحد من المخاطر."] },
        { h: "مدة الاحتفاظ بها", p: ["تُحفظ البيانات ما دامت العيادة بحاجة إليها لرعايتك وللوفاء بالتزاماتها، أو حتى حذفها بناءً على طلبك متى سمح القانون بذلك."] },
        { h: "حقوقك", p: ["يمكنك طلب الاطلاع على بياناتك وتصحيحها وحذفها والاعتراض على بعض الاستخدامات، وفقًا للقانون التشيلي رقم 19.628 بشأن حماية الحياة الخاصة والقواعد التي تحل محله. اكتب إلى العيادة التي تعالجك أو إلى {email}، وسنعالج طلبك مع العيادة."] },
        { h: "التغييرات على هذه السياسة", p: ["إذا حدّثناها فسننشر النسخة الجديدة هنا مع تاريخها."] },
      ],
    },
    terms: {
      title: "شروط الخدمة",
      intro: "باستخدامك Clinivista فإنك توافق على هذه الشروط. إذا لم توافق فلا تستخدم الخدمة.",
      sections: [
        { h: "الخدمة", p: ["تتيح Clinivista للعيادة استقبال صورك وبياناتك وتقييمها وإرسال رد إليك. أنت ترسل تقييمك إلى عيادة محددة وهي من تعالجك؛ أما Clinivista فتوفّر المنصة فقط."] },
        { h: "ليست استشارة طبية طارئة", p: ["يستند الرد الذي تتلقاه إلى الصور والبيانات التي أرسلتها ولا يحل محل الفحص الحضوري. وللتأكد من التشخيص وتحديد العلاج قد تطلب منك العيادة تقييمًا حضوريًا. وإذا كانت لديك حالة طبية طارئة فتوجّه إلى قسم الطوارئ."] },
        { h: "حسابك وبياناتك", ul: [
          "يجب أن تكون بالغًا وأن تقدّم معلومات صحيحة.",
          "أنت مسؤول عن حماية كلمة مرورك أو حسابك على Google وعن عدم مشاركة روابط نتائجك.",
          "يجب ألا ترسل إلا صورًا لك أو لشخص أذن لك بذلك."] },
        { h: "الاستخدام المناسب", p: ["لا يجوز لك استخدام الخدمة لأغراض غير قانونية أو محاولة الوصول إلى بيانات الآخرين أو التدخل في عملها. يجوز لنا تعليق الحسابات التي تخالف هذه الشروط."] },
        { h: "الخصوصية", p: ["تُشرح طريقة معالجة بياناتك في {privacy}."] },
        { h: "المسؤولية", p: ["نبذل ما هو معقول لتعمل الخدمة بشكل مستمر وآمن، لكننا لا نضمن خلوّها من الانقطاع. القرارات الطبية ونتائجها من مسؤولية العيادة وأخصائييها."] },
        { h: "الملكية الفكرية", p: ["المنصة وعلامتها التجارية ملك لـ Clinivista. تبقى صورك وبياناتك ملكًا لك؛ وأنت تأذن لنا وللعيادة التي تختارها باستخدامها لتقديم الخدمة الموصوفة."] },
        { h: "التغييرات والقانون المطبّق", p: ["يجوز لنا تحديث هذه الشروط وسننشر هنا النسخة السارية. تخضع لقوانين تشيلي. للاستفسار اكتب إلى {email}."] },
      ],
    },
  },
  zh: {
    company: "Clinivista", updated: "最近更新", privacyLinkText: "隐私政策", docsNav: "法律文件",
    privacy: {
      title: "隐私政策",
      intro: "Clinivista 是诊所用来接收患者照片和数据、进行评估并向患者发送结果的平台。本政策说明我们收集哪些数据、用于什么目的，以及您享有哪些权利。",
      sections: [
        { h: "谁对您的数据负责", p: ["您提交评估的诊所对您的临床数据负责，并决定其用途。Clinivista 代表该诊所行事：仅为向其提供服务而存储和处理数据，不将其用于任何其他目的。"] },
        { h: "我们收集哪些数据", ul: [
          "身份和联系数据：姓名、身份证号（RUT）、电话、电子邮件、年龄和城市。",
          "您提供的健康数据：病史、症状，以及您在评估中上传的照片。",
          "诊所医疗团队为您准备的诊断和回复，包括带有标注的照片。",
          "如果您使用 Google 登录：仅获取您的姓名和已验证的邮箱。我们不会访问您的邮件、联系人、文件或 Google 账户中的任何其他数据。",
          "服务运行和安全所需的最少技术数据（例如访问日志）。"] },
        { h: "我们如何使用这些数据", ul: [
          "让诊所评估您的情况并回复您。",
          "通过电子邮件、WhatsApp 或您的账户向您发送结果。",
          "创建并保护您的账户，确保只有您能看到自己的结果。",
          "维护服务安全并履行法律义务。"],
          after: ["只有在您注册时明确同意的情况下，我们才会出于商业目的联系您。"] },
        { h: "与谁共享", p: [
          "我们不会出售您的数据。负责您诊疗的诊所的授权人员，以及使服务得以运行的技术服务商可以访问这些数据：应用与数据库托管、照片私有存储、邮件发送和 Google 登录。这些服务商仅为提供其服务而处理数据。",
          "结果将通过您选择的渠道发送。任何拿到我们发给您的链接的人都可以打开您的报告，因此请勿分享。链接在 30 天后失效；您可以在账户中重新下载。"] },
        { h: "我们如何保护数据", p: ["照片保存在私有存储中，通信经过加密，工作人员访问需要授权账户，且只能看到本诊所的患者。没有任何系统是万无一失的，但我们会采取合理措施降低风险。"] },
        { h: "保存多长时间", p: ["只要诊所为了您的诊疗和履行其义务需要这些数据，我们就会保存；在法律允许的情况下，也会根据您的请求删除。"] },
        { h: "您的权利", p: ["根据智利关于保护隐私的第 19.628 号法律及其替代法规，您可以请求访问、更正和删除您的数据，并反对某些用途。请联系负责您诊疗的诊所或写信至 {email}，我们将与诊所一起处理您的请求。"] },
        { h: "本政策的变更", p: ["如果更新，我们会在此发布新版本并注明日期。"] },
      ],
    },
    terms: {
      title: "服务条款",
      intro: "使用 Clinivista 即表示您接受这些条款。如不同意，请勿使用本服务。",
      sections: [
        { h: "服务内容", p: ["Clinivista 让诊所接收您的照片和数据、进行评估并向您发送回复。您将评估提交给特定诊所，由该诊所为您诊疗；Clinivista 仅提供平台。"] },
        { h: "这不是急诊医疗咨询", p: ["您收到的回复基于您发送的照片和数据，不能替代面诊。为确认诊断并确定治疗方案，诊所可能会要求您到诊所接受评估。如遇医疗紧急情况，请前往急诊。"] },
        { h: "您的账户和数据", ul: [
          "您必须年满 18 周岁并提供真实信息。",
          "您有责任保管好您的密码或 Google 账户，并且不分享指向您结果的链接。",
          "您只能发送自己的照片，或已授权您发送的他人的照片。"] },
        { h: "合理使用", p: ["您不得将服务用于非法目的、试图访问他人数据或干扰其运行。对违反本条款的账户，我们可以暂停使用。"] },
        { h: "隐私", p: ["我们如何处理您的数据，请见{privacy}。"] },
        { h: "责任", p: ["我们会尽合理努力使服务持续、安全地运行，但不保证不会中断。医疗决定及其结果由诊所及其专业人员负责。"] },
        { h: "知识产权", p: ["平台及其品牌归 Clinivista 所有。您的照片和数据仍归您所有；您授权我们及您选择的诊所为提供上述服务而使用它们。"] },
        { h: "变更与适用法律", p: ["我们可能更新这些条款，并会在此发布现行版本。本条款适用智利法律。如有疑问，请写信至 {email}。"] },
      ],
    },
  },
};
