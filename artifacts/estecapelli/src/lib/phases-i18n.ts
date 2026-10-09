// Textos del proceso por fases y del diagnóstico en el panel del personal, en los nueve idiomas.
import type { AppTranslations, LangCode } from "./language";
import { PLASTIC_TEXT, PLASTIC_VIEW_KEYS } from "./specialty-i18n";

export const DATE_LOCALES: Record<LangCode, string> = { es: "es-CL", en: "en-US", pt: "pt-BR", fr: "fr-FR", de: "de-DE", it: "it-IT", tr: "tr-TR", ar: "ar", zh: "zh-CN" };

export type PhasesText = {
  title: string; subtitle: string; loading: string; loadError: string;
  phaseAria: (n: number, name: string) => string;
  closed: string; open: string;
  patientTakes: string; patientDone: string; patientPending: string;
  opensAfter: (name: string) => string;
  optional: string;
  viewPhoto: (label: string) => string;
  takePhoto: string; repeat: string; upload: string;
  takeAria: (label: string) => string; chooseAria: (label: string) => string; removeAria: (label: string) => string;
  confirmRemovePhoto: (label: string) => string;
  photoNotSaved: string; tryAgain: string; cantSavePhoto: string; cantRemovePhoto: string; photoTooBig: string;
  // diagnosis
  logSaved: string; logClosed: string; logReopened: string;
  channelEmail: string; channelWhatsapp: string; deliverySent: string; deliveryLink: string; deliveryFailed: string;
  sendTitle: string; sendIntro: string; chosenEmail: string; chosenWhatsapp: string; noChoice: string;
  viewPdf: string; sendEmail: string; sendWhatsapp: string; noEmailTitle: string; emailNotConfigured: string; openWhatsapp: string;
  emailSentToast: string; whatsappReadyToast: string; cantSendResults: string;
  draft: string; closedBy: (name: string | null | undefined, date: string) => string;
  notReady: string; onlyDoctor: string; withDrawing: string;
  annotate: string; editDrawing: string; annotateAria: (editing: boolean, label: string) => string;
  removeDrawingAria: (label: string) => string; confirmRemoveDrawing: (label: string) => string; cantRemoveDrawing: string;
  responseLabel: string; responsePlaceholder: string;
  saveDraft: string; draftSaved: string; cantSaveDraft: string;
  closeDiagnosis: string; confirmClose: string; diagnosisClosed: string; cantClose: string;
  reopen: string; confirmReopen: string; reopened: string; cantReopen: string;
  log: (n: number) => string; loadingDiagnosis: string; diagnosisError: string;
  drawingSaved: string; cantSaveDrawing: string;
  norwoodInconclusive: string;
};

export const PHASES_TEXT: Record<LangCode, PhasesText> = {
  es: {
    title: "Proceso por fases", subtitle: "Cada fase se abre cuando se completa la anterior.", loading: "Cargando…", loadError: "No pudimos cargar las fases.",
    phaseAria: (n, name) => `Fase ${n}: ${name}`, closed: "Cerrado", open: "Abierto",
    patientTakes: "La toma el paciente desde el enlace de la clínica", patientDone: " — completa.", patientPending: " — pendiente.",
    opensAfter: (name) => `Se abre al completar «${name}».`, optional: " (opcional)",
    viewPhoto: (l) => `Ver ${l}`, takePhoto: "Tomar foto", repeat: "Repetir", upload: "Subir",
    takeAria: (l) => `Tomar foto de ${l}`, chooseAria: (l) => `Elegir archivo de ${l}`, removeAria: (l) => `Quitar foto de ${l}`,
    confirmRemovePhoto: (l) => `¿Quitar la foto de «${l}»?`,
    photoNotSaved: "No se guardó la foto", tryAgain: "Inténtalo de nuevo.", cantSavePhoto: "No pudimos guardar la foto.", cantRemovePhoto: "No pudimos quitar la foto", photoTooBig: "La foto pesa más de 10 MB.",
    logSaved: "Guardó un borrador", logClosed: "Cerró el diagnóstico", logReopened: "Reabrió el diagnóstico",
    channelEmail: "Correo", channelWhatsapp: "WhatsApp", deliverySent: "Enviado", deliveryLink: "Enlace entregado", deliveryFailed: "Falló",
    sendTitle: "Enviar resultados al paciente", sendIntro: "El paciente recibe un PDF con tus dibujos y tu respuesta.",
    chosenEmail: " Eligió recibirlo por correo.", chosenWhatsapp: " Eligió recibirlo por WhatsApp.", noChoice: " No indicó cómo prefiere recibirlo.",
    viewPdf: "Ver PDF", sendEmail: "Enviar por correo", sendWhatsapp: "Enviar por WhatsApp", noEmailTitle: "El paciente no registró correo",
    emailNotConfigured: "El envío de correos aún no está configurado en el servidor; mientras tanto usa WhatsApp.", openWhatsapp: "Abrir WhatsApp",
    emailSentToast: "Correo enviado al paciente", whatsappReadyToast: "Enlace listo para WhatsApp", cantSendResults: "No pudimos enviar los resultados",
    draft: "En borrador", closedBy: (n, d) => `Cerrado${n ? ` por ${n}` : ""} · ${d}`,
    notReady: "El paciente aún no completa su pre-evaluación; el diagnóstico se podrá cerrar cuando la termine.", onlyDoctor: "Solo el médico puede editar el diagnóstico. Aquí puedes verlo.", withDrawing: " · con dibujo",
    annotate: "Anotar", editDrawing: "Editar dibujo", annotateAria: (e, l) => `${e ? "Editar dibujo de" : "Anotar"} ${l}`,
    removeDrawingAria: (l) => `Quitar dibujo de ${l}`, confirmRemoveDrawing: (l) => `¿Quitar el dibujo de «${l}»? La foto original no se toca.`, cantRemoveDrawing: "No pudimos quitar el dibujo",
    responseLabel: "Respuesta para el paciente", responsePlaceholder: "Escribe el diagnóstico y la recomendación del equipo médico.",
    saveDraft: "Guardar borrador", draftSaved: "Borrador guardado", cantSaveDraft: "No pudimos guardar el borrador",
    closeDiagnosis: "Cerrar diagnóstico", confirmClose: "Al cerrar el diagnóstico queda en solo lectura y se abre la fase siguiente. Podrás reabrirlo si hace falta. ¿Cerrar?", diagnosisClosed: "Diagnóstico cerrado", cantClose: "No pudimos cerrar el diagnóstico",
    reopen: "Reabrir diagnóstico", confirmReopen: "Reabrir el diagnóstico permite editarlo y vuelve a bloquear las fases siguientes hasta cerrarlo de nuevo. Queda registrado. ¿Reabrir?", reopened: "Diagnóstico reabierto", cantReopen: "No pudimos reabrir el diagnóstico",
    log: (n) => `Registro (${n})`, loadingDiagnosis: "Cargando…", diagnosisError: "No pudimos cargar el diagnóstico.",
    drawingSaved: "Dibujo guardado", cantSaveDrawing: "No pudimos guardar el dibujo", norwoodInconclusive: "No concluyente",
  },
  en: {
    title: "Process by phases", subtitle: "Each phase opens when the previous one is complete.", loading: "Loading…", loadError: "We couldn't load the phases.",
    phaseAria: (n, name) => `Phase ${n}: ${name}`, closed: "Closed", open: "Open",
    patientTakes: "Taken by the patient from the clinic's link", patientDone: " — complete.", patientPending: " — pending.",
    opensAfter: (name) => `Opens once “${name}” is complete.`, optional: " (optional)",
    viewPhoto: (l) => `View ${l}`, takePhoto: "Take photo", repeat: "Retake", upload: "Upload",
    takeAria: (l) => `Take photo of ${l}`, chooseAria: (l) => `Choose file for ${l}`, removeAria: (l) => `Remove photo of ${l}`,
    confirmRemovePhoto: (l) => `Remove the photo of “${l}”?`,
    photoNotSaved: "The photo was not saved", tryAgain: "Please try again.", cantSavePhoto: "We couldn't save the photo.", cantRemovePhoto: "We couldn't remove the photo", photoTooBig: "The photo is larger than 10 MB.",
    logSaved: "Saved a draft", logClosed: "Closed the diagnosis", logReopened: "Reopened the diagnosis",
    channelEmail: "Email", channelWhatsapp: "WhatsApp", deliverySent: "Sent", deliveryLink: "Link delivered", deliveryFailed: "Failed",
    sendTitle: "Send results to the patient", sendIntro: "The patient receives a PDF with your drawings and your answer.",
    chosenEmail: " They chose to receive it by email.", chosenWhatsapp: " They chose to receive it by WhatsApp.", noChoice: " They didn't say how they prefer to receive it.",
    viewPdf: "View PDF", sendEmail: "Send by email", sendWhatsapp: "Send by WhatsApp", noEmailTitle: "The patient didn't provide an email",
    emailNotConfigured: "Email sending isn't configured on the server yet; use WhatsApp in the meantime.", openWhatsapp: "Open WhatsApp",
    emailSentToast: "Email sent to the patient", whatsappReadyToast: "Link ready for WhatsApp", cantSendResults: "We couldn't send the results",
    draft: "Draft", closedBy: (n, d) => `Closed${n ? ` by ${n}` : ""} · ${d}`,
    notReady: "The patient hasn't completed their pre-evaluation yet; the diagnosis can be closed once they finish it.", onlyDoctor: "Only the doctor can edit the diagnosis. You can view it here.", withDrawing: " · with drawing",
    annotate: "Annotate", editDrawing: "Edit drawing", annotateAria: (e, l) => `${e ? "Edit drawing of" : "Annotate"} ${l}`,
    removeDrawingAria: (l) => `Remove drawing of ${l}`, confirmRemoveDrawing: (l) => `Remove the drawing of “${l}”? The original photo is not touched.`, cantRemoveDrawing: "We couldn't remove the drawing",
    responseLabel: "Answer for the patient", responsePlaceholder: "Write the diagnosis and the medical team's recommendation.",
    saveDraft: "Save draft", draftSaved: "Draft saved", cantSaveDraft: "We couldn't save the draft",
    closeDiagnosis: "Close diagnosis", confirmClose: "Closing the diagnosis makes it read-only and opens the next phase. You can reopen it if needed. Close it?", diagnosisClosed: "Diagnosis closed", cantClose: "We couldn't close the diagnosis",
    reopen: "Reopen diagnosis", confirmReopen: "Reopening the diagnosis lets you edit it and locks the following phases again until it is closed. It is recorded. Reopen?", reopened: "Diagnosis reopened", cantReopen: "We couldn't reopen the diagnosis",
    log: (n) => `Log (${n})`, loadingDiagnosis: "Loading…", diagnosisError: "We couldn't load the diagnosis.",
    drawingSaved: "Drawing saved", cantSaveDrawing: "We couldn't save the drawing", norwoodInconclusive: "Inconclusive",
  },
  pt: {
    title: "Processo por fases", subtitle: "Cada fase abre quando a anterior é concluída.", loading: "Carregando…", loadError: "Não foi possível carregar as fases.",
    phaseAria: (n, name) => `Fase ${n}: ${name}`, closed: "Fechado", open: "Aberto",
    patientTakes: "Tirada pelo paciente pelo link da clínica", patientDone: " — concluída.", patientPending: " — pendente.",
    opensAfter: (name) => `Abre ao concluir «${name}».`, optional: " (opcional)",
    viewPhoto: (l) => `Ver ${l}`, takePhoto: "Tirar foto", repeat: "Repetir", upload: "Enviar",
    takeAria: (l) => `Tirar foto de ${l}`, chooseAria: (l) => `Escolher arquivo de ${l}`, removeAria: (l) => `Remover foto de ${l}`,
    confirmRemovePhoto: (l) => `Remover a foto de «${l}»?`,
    photoNotSaved: "A foto não foi salva", tryAgain: "Tente novamente.", cantSavePhoto: "Não foi possível salvar a foto.", cantRemovePhoto: "Não foi possível remover a foto", photoTooBig: "A foto tem mais de 10 MB.",
    logSaved: "Salvou um rascunho", logClosed: "Fechou o diagnóstico", logReopened: "Reabriu o diagnóstico",
    channelEmail: "E-mail", channelWhatsapp: "WhatsApp", deliverySent: "Enviado", deliveryLink: "Link entregue", deliveryFailed: "Falhou",
    sendTitle: "Enviar resultados ao paciente", sendIntro: "O paciente recebe um PDF com seus desenhos e sua resposta.",
    chosenEmail: " Escolheu receber por e-mail.", chosenWhatsapp: " Escolheu receber por WhatsApp.", noChoice: " Não indicou como prefere receber.",
    viewPdf: "Ver PDF", sendEmail: "Enviar por e-mail", sendWhatsapp: "Enviar por WhatsApp", noEmailTitle: "O paciente não informou e-mail",
    emailNotConfigured: "O envio de e-mails ainda não está configurado no servidor; use o WhatsApp por enquanto.", openWhatsapp: "Abrir WhatsApp",
    emailSentToast: "E-mail enviado ao paciente", whatsappReadyToast: "Link pronto para o WhatsApp", cantSendResults: "Não foi possível enviar os resultados",
    draft: "Rascunho", closedBy: (n, d) => `Fechado${n ? ` por ${n}` : ""} · ${d}`,
    notReady: "O paciente ainda não concluiu a pré-avaliação; o diagnóstico poderá ser fechado quando ele terminar.", onlyDoctor: "Somente o médico pode editar o diagnóstico. Aqui você pode vê-lo.", withDrawing: " · com desenho",
    annotate: "Anotar", editDrawing: "Editar desenho", annotateAria: (e, l) => `${e ? "Editar desenho de" : "Anotar"} ${l}`,
    removeDrawingAria: (l) => `Remover desenho de ${l}`, confirmRemoveDrawing: (l) => `Remover o desenho de «${l}»? A foto original não é alterada.`, cantRemoveDrawing: "Não foi possível remover o desenho",
    responseLabel: "Resposta para o paciente", responsePlaceholder: "Escreva o diagnóstico e a recomendação da equipe médica.",
    saveDraft: "Salvar rascunho", draftSaved: "Rascunho salvo", cantSaveDraft: "Não foi possível salvar o rascunho",
    closeDiagnosis: "Fechar diagnóstico", confirmClose: "Ao fechar o diagnóstico, ele fica somente leitura e a próxima fase é aberta. Você poderá reabri-lo se necessário. Fechar?", diagnosisClosed: "Diagnóstico fechado", cantClose: "Não foi possível fechar o diagnóstico",
    reopen: "Reabrir diagnóstico", confirmReopen: "Reabrir o diagnóstico permite editá-lo e bloqueia novamente as fases seguintes até fechá-lo. Fica registrado. Reabrir?", reopened: "Diagnóstico reaberto", cantReopen: "Não foi possível reabrir o diagnóstico",
    log: (n) => `Registro (${n})`, loadingDiagnosis: "Carregando…", diagnosisError: "Não foi possível carregar o diagnóstico.",
    drawingSaved: "Desenho salvo", cantSaveDrawing: "Não foi possível salvar o desenho", norwoodInconclusive: "Inconclusivo",
  },
  fr: {
    title: "Parcours par phases", subtitle: "Chaque phase s'ouvre quand la précédente est terminée.", loading: "Chargement…", loadError: "Impossible de charger les phases.",
    phaseAria: (n, name) => `Phase ${n} : ${name}`, closed: "Clôturé", open: "Ouvert",
    patientTakes: "Prise par le patient depuis le lien de la clinique", patientDone: " — terminée.", patientPending: " — en attente.",
    opensAfter: (name) => `S'ouvre une fois « ${name} » terminée.`, optional: " (facultatif)",
    viewPhoto: (l) => `Voir ${l}`, takePhoto: "Prendre une photo", repeat: "Reprendre", upload: "Téléverser",
    takeAria: (l) => `Prendre une photo : ${l}`, chooseAria: (l) => `Choisir un fichier : ${l}`, removeAria: (l) => `Supprimer la photo : ${l}`,
    confirmRemovePhoto: (l) => `Supprimer la photo « ${l} » ?`,
    photoNotSaved: "La photo n'a pas été enregistrée", tryAgain: "Veuillez réessayer.", cantSavePhoto: "Impossible d'enregistrer la photo.", cantRemovePhoto: "Impossible de supprimer la photo", photoTooBig: "La photo dépasse 10 Mo.",
    logSaved: "A enregistré un brouillon", logClosed: "A clôturé le diagnostic", logReopened: "A rouvert le diagnostic",
    channelEmail: "E-mail", channelWhatsapp: "WhatsApp", deliverySent: "Envoyé", deliveryLink: "Lien remis", deliveryFailed: "Échec",
    sendTitle: "Envoyer les résultats au patient", sendIntro: "Le patient reçoit un PDF avec vos dessins et votre réponse.",
    chosenEmail: " Il a choisi de le recevoir par e-mail.", chosenWhatsapp: " Il a choisi de le recevoir par WhatsApp.", noChoice: " Il n'a pas indiqué comment il préfère le recevoir.",
    viewPdf: "Voir le PDF", sendEmail: "Envoyer par e-mail", sendWhatsapp: "Envoyer par WhatsApp", noEmailTitle: "Le patient n'a pas indiqué d'e-mail",
    emailNotConfigured: "L'envoi d'e-mails n'est pas encore configuré sur le serveur ; utilisez WhatsApp en attendant.", openWhatsapp: "Ouvrir WhatsApp",
    emailSentToast: "E-mail envoyé au patient", whatsappReadyToast: "Lien prêt pour WhatsApp", cantSendResults: "Impossible d'envoyer les résultats",
    draft: "Brouillon", closedBy: (n, d) => `Clôturé${n ? ` par ${n}` : ""} · ${d}`,
    notReady: "Le patient n'a pas encore terminé sa pré-évaluation ; le diagnostic pourra être clôturé une fois terminée.", onlyDoctor: "Seul le médecin peut modifier le diagnostic. Vous pouvez le consulter ici.", withDrawing: " · avec dessin",
    annotate: "Annoter", editDrawing: "Modifier le dessin", annotateAria: (e, l) => `${e ? "Modifier le dessin de" : "Annoter"} ${l}`,
    removeDrawingAria: (l) => `Supprimer le dessin de ${l}`, confirmRemoveDrawing: (l) => `Supprimer le dessin de « ${l} » ? La photo originale n'est pas modifiée.`, cantRemoveDrawing: "Impossible de supprimer le dessin",
    responseLabel: "Réponse pour le patient", responsePlaceholder: "Rédigez le diagnostic et la recommandation de l'équipe médicale.",
    saveDraft: "Enregistrer le brouillon", draftSaved: "Brouillon enregistré", cantSaveDraft: "Impossible d'enregistrer le brouillon",
    closeDiagnosis: "Clôturer le diagnostic", confirmClose: "Une fois clôturé, le diagnostic passe en lecture seule et la phase suivante s'ouvre. Vous pourrez le rouvrir si besoin. Clôturer ?", diagnosisClosed: "Diagnostic clôturé", cantClose: "Impossible de clôturer le diagnostic",
    reopen: "Rouvrir le diagnostic", confirmReopen: "Rouvrir le diagnostic permet de le modifier et verrouille à nouveau les phases suivantes jusqu'à sa clôture. L'action est enregistrée. Rouvrir ?", reopened: "Diagnostic rouvert", cantReopen: "Impossible de rouvrir le diagnostic",
    log: (n) => `Historique (${n})`, loadingDiagnosis: "Chargement…", diagnosisError: "Impossible de charger le diagnostic.",
    drawingSaved: "Dessin enregistré", cantSaveDrawing: "Impossible d'enregistrer le dessin", norwoodInconclusive: "Non concluant",
  },
  de: {
    title: "Ablauf nach Phasen", subtitle: "Jede Phase öffnet sich, wenn die vorherige abgeschlossen ist.", loading: "Wird geladen…", loadError: "Die Phasen konnten nicht geladen werden.",
    phaseAria: (n, name) => `Phase ${n}: ${name}`, closed: "Abgeschlossen", open: "Offen",
    patientTakes: "Wird vom Patienten über den Link der Klinik aufgenommen", patientDone: " — abgeschlossen.", patientPending: " — ausstehend.",
    opensAfter: (name) => `Öffnet sich nach Abschluss von „${name}“.`, optional: " (optional)",
    viewPhoto: (l) => `${l} ansehen`, takePhoto: "Foto aufnehmen", repeat: "Wiederholen", upload: "Hochladen",
    takeAria: (l) => `Foto aufnehmen: ${l}`, chooseAria: (l) => `Datei wählen: ${l}`, removeAria: (l) => `Foto entfernen: ${l}`,
    confirmRemovePhoto: (l) => `Foto „${l}“ entfernen?`,
    photoNotSaved: "Das Foto wurde nicht gespeichert", tryAgain: "Bitte versuchen Sie es erneut.", cantSavePhoto: "Das Foto konnte nicht gespeichert werden.", cantRemovePhoto: "Das Foto konnte nicht entfernt werden", photoTooBig: "Das Foto ist größer als 10 MB.",
    logSaved: "Entwurf gespeichert", logClosed: "Diagnose abgeschlossen", logReopened: "Diagnose wieder geöffnet",
    channelEmail: "E-Mail", channelWhatsapp: "WhatsApp", deliverySent: "Gesendet", deliveryLink: "Link übergeben", deliveryFailed: "Fehlgeschlagen",
    sendTitle: "Ergebnisse an den Patienten senden", sendIntro: "Der Patient erhält ein PDF mit Ihren Zeichnungen und Ihrer Antwort.",
    chosenEmail: " Er möchte es per E-Mail erhalten.", chosenWhatsapp: " Er möchte es per WhatsApp erhalten.", noChoice: " Er hat nicht angegeben, wie er es erhalten möchte.",
    viewPdf: "PDF ansehen", sendEmail: "Per E-Mail senden", sendWhatsapp: "Per WhatsApp senden", noEmailTitle: "Der Patient hat keine E-Mail angegeben",
    emailNotConfigured: "Der E-Mail-Versand ist auf dem Server noch nicht eingerichtet; nutzen Sie vorerst WhatsApp.", openWhatsapp: "WhatsApp öffnen",
    emailSentToast: "E-Mail an den Patienten gesendet", whatsappReadyToast: "Link für WhatsApp bereit", cantSendResults: "Die Ergebnisse konnten nicht gesendet werden",
    draft: "Entwurf", closedBy: (n, d) => `Abgeschlossen${n ? ` von ${n}` : ""} · ${d}`,
    notReady: "Der Patient hat die Voruntersuchung noch nicht abgeschlossen; die Diagnose kann danach abgeschlossen werden.", onlyDoctor: "Nur der Arzt kann die Diagnose bearbeiten. Hier können Sie sie ansehen.", withDrawing: " · mit Zeichnung",
    annotate: "Markieren", editDrawing: "Zeichnung bearbeiten", annotateAria: (e, l) => `${e ? "Zeichnung bearbeiten:" : "Markieren:"} ${l}`,
    removeDrawingAria: (l) => `Zeichnung entfernen: ${l}`, confirmRemoveDrawing: (l) => `Zeichnung von „${l}“ entfernen? Das Originalfoto bleibt unverändert.`, cantRemoveDrawing: "Die Zeichnung konnte nicht entfernt werden",
    responseLabel: "Antwort für den Patienten", responsePlaceholder: "Schreiben Sie die Diagnose und die Empfehlung des medizinischen Teams.",
    saveDraft: "Entwurf speichern", draftSaved: "Entwurf gespeichert", cantSaveDraft: "Der Entwurf konnte nicht gespeichert werden",
    closeDiagnosis: "Diagnose abschließen", confirmClose: "Nach dem Abschluss ist die Diagnose schreibgeschützt und die nächste Phase öffnet sich. Sie kann bei Bedarf wieder geöffnet werden. Abschließen?", diagnosisClosed: "Diagnose abgeschlossen", cantClose: "Die Diagnose konnte nicht abgeschlossen werden",
    reopen: "Diagnose wieder öffnen", confirmReopen: "Beim Wiederöffnen kann die Diagnose bearbeitet werden und die folgenden Phasen sind bis zum erneuten Abschluss gesperrt. Dies wird protokolliert. Wieder öffnen?", reopened: "Diagnose wieder geöffnet", cantReopen: "Die Diagnose konnte nicht wieder geöffnet werden",
    log: (n) => `Protokoll (${n})`, loadingDiagnosis: "Wird geladen…", diagnosisError: "Die Diagnose konnte nicht geladen werden.",
    drawingSaved: "Zeichnung gespeichert", cantSaveDrawing: "Die Zeichnung konnte nicht gespeichert werden", norwoodInconclusive: "Nicht eindeutig",
  },
  it: {
    title: "Percorso per fasi", subtitle: "Ogni fase si apre quando la precedente è completata.", loading: "Caricamento…", loadError: "Impossibile caricare le fasi.",
    phaseAria: (n, name) => `Fase ${n}: ${name}`, closed: "Chiuso", open: "Aperto",
    patientTakes: "Scattata dal paziente dal link della clinica", patientDone: " — completata.", patientPending: " — in sospeso.",
    opensAfter: (name) => `Si apre al completamento di «${name}».`, optional: " (facoltativo)",
    viewPhoto: (l) => `Vedi ${l}`, takePhoto: "Scatta foto", repeat: "Ripeti", upload: "Carica",
    takeAria: (l) => `Scatta foto di ${l}`, chooseAria: (l) => `Scegli file di ${l}`, removeAria: (l) => `Rimuovi foto di ${l}`,
    confirmRemovePhoto: (l) => `Rimuovere la foto di «${l}»?`,
    photoNotSaved: "La foto non è stata salvata", tryAgain: "Riprova.", cantSavePhoto: "Impossibile salvare la foto.", cantRemovePhoto: "Impossibile rimuovere la foto", photoTooBig: "La foto supera i 10 MB.",
    logSaved: "Ha salvato una bozza", logClosed: "Ha chiuso la diagnosi", logReopened: "Ha riaperto la diagnosi",
    channelEmail: "E-mail", channelWhatsapp: "WhatsApp", deliverySent: "Inviato", deliveryLink: "Link consegnato", deliveryFailed: "Non riuscito",
    sendTitle: "Invia i risultati al paziente", sendIntro: "Il paziente riceve un PDF con i tuoi disegni e la tua risposta.",
    chosenEmail: " Ha scelto di riceverlo via e-mail.", chosenWhatsapp: " Ha scelto di riceverlo su WhatsApp.", noChoice: " Non ha indicato come preferisce riceverlo.",
    viewPdf: "Vedi PDF", sendEmail: "Invia via e-mail", sendWhatsapp: "Invia su WhatsApp", noEmailTitle: "Il paziente non ha indicato un'e-mail",
    emailNotConfigured: "L'invio delle e-mail non è ancora configurato sul server; nel frattempo usa WhatsApp.", openWhatsapp: "Apri WhatsApp",
    emailSentToast: "E-mail inviata al paziente", whatsappReadyToast: "Link pronto per WhatsApp", cantSendResults: "Impossibile inviare i risultati",
    draft: "Bozza", closedBy: (n, d) => `Chiuso${n ? ` da ${n}` : ""} · ${d}`,
    notReady: "Il paziente non ha ancora completato la pre-valutazione; la diagnosi potrà essere chiusa quando avrà finito.", onlyDoctor: "Solo il medico può modificare la diagnosi. Qui puoi consultarla.", withDrawing: " · con disegno",
    annotate: "Annota", editDrawing: "Modifica disegno", annotateAria: (e, l) => `${e ? "Modifica disegno di" : "Annota"} ${l}`,
    removeDrawingAria: (l) => `Rimuovi disegno di ${l}`, confirmRemoveDrawing: (l) => `Rimuovere il disegno di «${l}»? La foto originale non viene toccata.`, cantRemoveDrawing: "Impossibile rimuovere il disegno",
    responseLabel: "Risposta per il paziente", responsePlaceholder: "Scrivi la diagnosi e la raccomandazione del team medico.",
    saveDraft: "Salva bozza", draftSaved: "Bozza salvata", cantSaveDraft: "Impossibile salvare la bozza",
    closeDiagnosis: "Chiudi diagnosi", confirmClose: "Chiudendo la diagnosi diventa di sola lettura e si apre la fase successiva. Potrai riaprirla se necessario. Chiudere?", diagnosisClosed: "Diagnosi chiusa", cantClose: "Impossibile chiudere la diagnosi",
    reopen: "Riapri diagnosi", confirmReopen: "Riaprire la diagnosi permette di modificarla e blocca di nuovo le fasi successive fino alla chiusura. Viene registrato. Riaprire?", reopened: "Diagnosi riaperta", cantReopen: "Impossibile riaprire la diagnosi",
    log: (n) => `Registro (${n})`, loadingDiagnosis: "Caricamento…", diagnosisError: "Impossibile caricare la diagnosi.",
    drawingSaved: "Disegno salvato", cantSaveDrawing: "Impossibile salvare il disegno", norwoodInconclusive: "Non conclusivo",
  },
  tr: {
    title: "Aşamalara göre süreç", subtitle: "Her aşama, bir öncekinin tamamlanmasıyla açılır.", loading: "Yükleniyor…", loadError: "Aşamalar yüklenemedi.",
    phaseAria: (n, name) => `${n}. aşama: ${name}`, closed: "Kapalı", open: "Açık",
    patientTakes: "Hasta, kliniğin bağlantısından çeker", patientDone: " — tamamlandı.", patientPending: " — bekliyor.",
    opensAfter: (name) => `“${name}” tamamlanınca açılır.`, optional: " (isteğe bağlı)",
    viewPhoto: (l) => `${l} görüntüle`, takePhoto: "Fotoğraf çek", repeat: "Tekrarla", upload: "Yükle",
    takeAria: (l) => `${l} için fotoğraf çek`, chooseAria: (l) => `${l} için dosya seç`, removeAria: (l) => `${l} fotoğrafını kaldır`,
    confirmRemovePhoto: (l) => `“${l}” fotoğrafı kaldırılsın mı?`,
    photoNotSaved: "Fotoğraf kaydedilmedi", tryAgain: "Lütfen tekrar deneyin.", cantSavePhoto: "Fotoğraf kaydedilemedi.", cantRemovePhoto: "Fotoğraf kaldırılamadı", photoTooBig: "Fotoğraf 10 MB'den büyük.",
    logSaved: "Taslak kaydetti", logClosed: "Teşhisi kapattı", logReopened: "Teşhisi yeniden açtı",
    channelEmail: "E-posta", channelWhatsapp: "WhatsApp", deliverySent: "Gönderildi", deliveryLink: "Bağlantı iletildi", deliveryFailed: "Başarısız",
    sendTitle: "Sonuçları hastaya gönder", sendIntro: "Hasta, çizimlerinizi ve yanıtınızı içeren bir PDF alır.",
    chosenEmail: " E-posta ile almayı seçti.", chosenWhatsapp: " WhatsApp ile almayı seçti.", noChoice: " Nasıl almak istediğini belirtmedi.",
    viewPdf: "PDF'yi görüntüle", sendEmail: "E-posta ile gönder", sendWhatsapp: "WhatsApp ile gönder", noEmailTitle: "Hasta e-posta girmedi",
    emailNotConfigured: "E-posta gönderimi sunucuda henüz yapılandırılmadı; şimdilik WhatsApp'ı kullanın.", openWhatsapp: "WhatsApp'ı aç",
    emailSentToast: "E-posta hastaya gönderildi", whatsappReadyToast: "WhatsApp bağlantısı hazır", cantSendResults: "Sonuçlar gönderilemedi",
    draft: "Taslak", closedBy: (n, d) => `Kapatıldı${n ? ` · ${n}` : ""} · ${d}`,
    notReady: "Hasta ön değerlendirmesini henüz tamamlamadı; tamamlandığında teşhis kapatılabilir.", onlyDoctor: "Teşhisi yalnızca doktor düzenleyebilir. Burada görüntüleyebilirsiniz.", withDrawing: " · çizimli",
    annotate: "Not al", editDrawing: "Çizimi düzenle", annotateAria: (e, l) => `${l}: ${e ? "çizimi düzenle" : "not al"}`,
    removeDrawingAria: (l) => `${l} çizimini kaldır`, confirmRemoveDrawing: (l) => `“${l}” çizimi kaldırılsın mı? Orijinal fotoğrafa dokunulmaz.`, cantRemoveDrawing: "Çizim kaldırılamadı",
    responseLabel: "Hasta için yanıt", responsePlaceholder: "Teşhisi ve tıbbi ekibin önerisini yazın.",
    saveDraft: "Taslağı kaydet", draftSaved: "Taslak kaydedildi", cantSaveDraft: "Taslak kaydedilemedi",
    closeDiagnosis: "Teşhisi kapat", confirmClose: "Teşhis kapatılınca salt okunur olur ve sonraki aşama açılır. Gerekirse yeniden açabilirsiniz. Kapatılsın mı?", diagnosisClosed: "Teşhis kapatıldı", cantClose: "Teşhis kapatılamadı",
    reopen: "Teşhisi yeniden aç", confirmReopen: "Teşhisi yeniden açmak düzenlemeye izin verir ve tekrar kapatılana kadar sonraki aşamaları kilitler. Kaydedilir. Yeniden açılsın mı?", reopened: "Teşhis yeniden açıldı", cantReopen: "Teşhis yeniden açılamadı",
    log: (n) => `Kayıt (${n})`, loadingDiagnosis: "Yükleniyor…", diagnosisError: "Teşhis yüklenemedi.",
    drawingSaved: "Çizim kaydedildi", cantSaveDrawing: "Çizim kaydedilemedi", norwoodInconclusive: "Sonuçsuz",
  },
  ar: {
    title: "العملية حسب المراحل", subtitle: "تُفتح كل مرحلة عند اكتمال المرحلة السابقة.", loading: "جارٍ التحميل…", loadError: "تعذّر تحميل المراحل.",
    phaseAria: (n, name) => `المرحلة ${n}: ${name}`, closed: "مغلق", open: "مفتوح",
    patientTakes: "يلتقطها المريض من رابط العيادة", patientDone: " — مكتملة.", patientPending: " — قيد الانتظار.",
    opensAfter: (name) => `تُفتح عند اكتمال «${name}».`, optional: " (اختياري)",
    viewPhoto: (l) => `عرض ${l}`, takePhoto: "التقاط صورة", repeat: "إعادة", upload: "رفع",
    takeAria: (l) => `التقاط صورة: ${l}`, chooseAria: (l) => `اختيار ملف: ${l}`, removeAria: (l) => `حذف صورة: ${l}`,
    confirmRemovePhoto: (l) => `حذف صورة «${l}»؟`,
    photoNotSaved: "لم يتم حفظ الصورة", tryAgain: "حاول مرة أخرى.", cantSavePhoto: "تعذّر حفظ الصورة.", cantRemovePhoto: "تعذّر حذف الصورة", photoTooBig: "حجم الصورة أكبر من 10 ميغابايت.",
    logSaved: "حفظ مسودة", logClosed: "أغلق التشخيص", logReopened: "أعاد فتح التشخيص",
    channelEmail: "البريد الإلكتروني", channelWhatsapp: "واتساب", deliverySent: "تم الإرسال", deliveryLink: "تم تسليم الرابط", deliveryFailed: "فشل",
    sendTitle: "إرسال النتائج إلى المريض", sendIntro: "يتلقى المريض ملف PDF يتضمن رسوماتك وإجابتك.",
    chosenEmail: " اختار استلامها عبر البريد الإلكتروني.", chosenWhatsapp: " اختار استلامها عبر واتساب.", noChoice: " لم يحدد الطريقة المفضلة للاستلام.",
    viewPdf: "عرض PDF", sendEmail: "إرسال بالبريد الإلكتروني", sendWhatsapp: "إرسال عبر واتساب", noEmailTitle: "لم يسجّل المريض بريداً إلكترونياً",
    emailNotConfigured: "إرسال البريد الإلكتروني غير مُعدّ بعد على الخادم؛ استخدم واتساب في الوقت الحالي.", openWhatsapp: "فتح واتساب",
    emailSentToast: "تم إرسال البريد إلى المريض", whatsappReadyToast: "الرابط جاهز لواتساب", cantSendResults: "تعذّر إرسال النتائج",
    draft: "مسودة", closedBy: (n, d) => `أُغلق${n ? ` بواسطة ${n}` : ""} · ${d}`,
    notReady: "لم يُكمل المريض تقييمه المبدئي بعد؛ يمكن إغلاق التشخيص عند اكتماله.", onlyDoctor: "يمكن للطبيب فقط تعديل التشخيص. يمكنك الاطلاع عليه هنا.", withDrawing: " · مع رسم",
    annotate: "إضافة ملاحظات", editDrawing: "تعديل الرسم", annotateAria: (e, l) => `${e ? "تعديل رسم" : "إضافة ملاحظات على"} ${l}`,
    removeDrawingAria: (l) => `حذف رسم ${l}`, confirmRemoveDrawing: (l) => `حذف رسم «${l}»؟ لن تتغير الصورة الأصلية.`, cantRemoveDrawing: "تعذّر حذف الرسم",
    responseLabel: "الإجابة للمريض", responsePlaceholder: "اكتب التشخيص وتوصية الفريق الطبي.",
    saveDraft: "حفظ المسودة", draftSaved: "تم حفظ المسودة", cantSaveDraft: "تعذّر حفظ المسودة",
    closeDiagnosis: "إغلاق التشخيص", confirmClose: "عند إغلاق التشخيص يصبح للقراءة فقط وتُفتح المرحلة التالية. يمكنك إعادة فتحه عند الحاجة. هل تريد الإغلاق؟", diagnosisClosed: "تم إغلاق التشخيص", cantClose: "تعذّر إغلاق التشخيص",
    reopen: "إعادة فتح التشخيص", confirmReopen: "إعادة فتح التشخيص تتيح تعديله وتقفل المراحل التالية حتى يُغلق مجدداً. يتم تسجيل ذلك. هل تريد إعادة الفتح؟", reopened: "أُعيد فتح التشخيص", cantReopen: "تعذّر إعادة فتح التشخيص",
    log: (n) => `السجل (${n})`, loadingDiagnosis: "جارٍ التحميل…", diagnosisError: "تعذّر تحميل التشخيص.",
    drawingSaved: "تم حفظ الرسم", cantSaveDrawing: "تعذّر حفظ الرسم", norwoodInconclusive: "غير حاسم",
  },
  zh: {
    title: "分阶段流程", subtitle: "上一阶段完成后，下一阶段才会开启。", loading: "加载中…", loadError: "无法加载阶段。",
    phaseAria: (n, name) => `第 ${n} 阶段：${name}`, closed: "已关闭", open: "进行中",
    patientTakes: "由患者通过诊所链接拍摄", patientDone: " — 已完成。", patientPending: " — 待完成。",
    opensAfter: (name) => `完成“${name}”后开启。`, optional: "（可选）",
    viewPhoto: (l) => `查看${l}`, takePhoto: "拍照", repeat: "重拍", upload: "上传",
    takeAria: (l) => `拍摄${l}`, chooseAria: (l) => `选择${l}的文件`, removeAria: (l) => `删除${l}的照片`,
    confirmRemovePhoto: (l) => `删除“${l}”的照片吗？`,
    photoNotSaved: "照片未保存", tryAgain: "请重试。", cantSavePhoto: "无法保存照片。", cantRemovePhoto: "无法删除照片", photoTooBig: "照片超过 10 MB。",
    logSaved: "保存了草稿", logClosed: "关闭了诊断", logReopened: "重新打开了诊断",
    channelEmail: "邮件", channelWhatsapp: "WhatsApp", deliverySent: "已发送", deliveryLink: "已提供链接", deliveryFailed: "失败",
    sendTitle: "向患者发送结果", sendIntro: "患者将收到包含您的标注和答复的 PDF。",
    chosenEmail: " 患者选择通过邮件接收。", chosenWhatsapp: " 患者选择通过 WhatsApp 接收。", noChoice: " 患者未说明接收方式。",
    viewPdf: "查看 PDF", sendEmail: "通过邮件发送", sendWhatsapp: "通过 WhatsApp 发送", noEmailTitle: "患者未填写邮箱",
    emailNotConfigured: "服务器尚未配置邮件发送；请暂时使用 WhatsApp。", openWhatsapp: "打开 WhatsApp",
    emailSentToast: "邮件已发送给患者", whatsappReadyToast: "WhatsApp 链接已就绪", cantSendResults: "无法发送结果",
    draft: "草稿", closedBy: (n, d) => `已关闭${n ? `，操作人：${n}` : ""} · ${d}`,
    notReady: "患者尚未完成预评估；完成后即可关闭诊断。", onlyDoctor: "只有医生可以编辑诊断，您可以在此查看。", withDrawing: " · 含标注",
    annotate: "标注", editDrawing: "编辑标注", annotateAria: (e, l) => `${e ? "编辑标注：" : "标注："}${l}`,
    removeDrawingAria: (l) => `删除${l}的标注`, confirmRemoveDrawing: (l) => `删除“${l}”的标注吗？原始照片不会改变。`, cantRemoveDrawing: "无法删除标注",
    responseLabel: "给患者的答复", responsePlaceholder: "请填写诊断结果和医疗团队的建议。",
    saveDraft: "保存草稿", draftSaved: "草稿已保存", cantSaveDraft: "无法保存草稿",
    closeDiagnosis: "关闭诊断", confirmClose: "关闭诊断后将变为只读，并开启下一阶段。必要时可重新打开。确定关闭吗？", diagnosisClosed: "诊断已关闭", cantClose: "无法关闭诊断",
    reopen: "重新打开诊断", confirmReopen: "重新打开诊断后可以编辑，并会再次锁定后续阶段，直至再次关闭。该操作会被记录。确定重新打开吗？", reopened: "诊断已重新打开", cantReopen: "无法重新打开诊断",
    log: (n) => `记录（${n}）`, loadingDiagnosis: "加载中…", diagnosisError: "无法加载诊断。",
    drawingSaved: "标注已保存", cantSaveDrawing: "无法保存标注", norwoodInconclusive: "无定论",
  },
};

// ---- Names of the starting phases and photo views, translated unless the clinic renamed them ----

const PHASE_NAMES: Record<string, Record<LangCode, string>> = {
  preevaluacion: { es: "Pre-evaluación", en: "Pre-evaluation", pt: "Pré-avaliação", fr: "Pré-évaluation", de: "Voruntersuchung", it: "Pre-valutazione", tr: "Ön değerlendirme", ar: "التقييم المبدئي", zh: "预评估" },
  diagnostico: { es: "Diagnóstico", en: "Diagnosis", pt: "Diagnóstico", fr: "Diagnostic", de: "Diagnose", it: "Diagnosi", tr: "Teşhis", ar: "التشخيص", zh: "诊断" },
  preoperatorio: { es: "Pre-operatorio", en: "Pre-operative", pt: "Pré-operatório", fr: "Préopératoire", de: "Präoperativ", it: "Pre-operatorio", tr: "Ameliyat öncesi", ar: "ما قبل الجراحة", zh: "术前" },
  postoperatorio: { es: "Post-operatorio", en: "Post-operative", pt: "Pós-operatório", fr: "Postopératoire", de: "Postoperativ", it: "Post-operatorio", tr: "Ameliyat sonrası", ar: "ما بعد الجراحة", zh: "术后" },
  "control-1": { es: "Control médico 1", en: "Medical check-up 1", pt: "Controle médico 1", fr: "Contrôle médical 1", de: "Ärztliche Kontrolle 1", it: "Controllo medico 1", tr: "Tıbbi kontrol 1", ar: "المراجعة الطبية 1", zh: "医学复查 1" },
  "control-2": { es: "Control médico 2", en: "Medical check-up 2", pt: "Controle médico 2", fr: "Contrôle médical 2", de: "Ärztliche Kontrolle 2", it: "Controllo medico 2", tr: "Tıbbi kontrol 2", ar: "المراجعة الطبية 2", zh: "医学复查 2" },
};

/** The phase's name in the panel's language; a name the clinic changed is shown as typed. */
export function phaseName(phase: { key?: string; name: string }, lang: LangCode): string {
  const known = phase.key ? PHASE_NAMES[phase.key] : undefined;
  return known && phase.name === known.es ? known[lang] : phase.name;
}

const CAPILAR_VIEWS: Record<string, { es: string; title: keyof AppTranslations }> = {
  frontal: { es: "Vista frontal", title: "photoFrontalTitle" },
  vertex: { es: "Vista superior / vértex", title: "photoVertexTitle" },
  temporalRight: { es: "Temporal derecha", title: "photoTRTitle" },
  temporalLeft: { es: "Temporal izquierda", title: "photoTLTitle" },
  donor: { es: "Zona donante", title: "photoDonorTitle" },
};

/** The photo view's name in the panel's language; later phases repeat the starting views under "<phase>-<view>" keys. */
export function viewLabel(view: { key: string; label: string }, phaseKey: string | undefined, lang: LangCode, t: AppTranslations): string {
  const base = phaseKey && view.key.startsWith(`${phaseKey}-`) ? view.key.slice(phaseKey.length + 1) : view.key;
  const capilar = CAPILAR_VIEWS[base];
  if (capilar) return view.label === capilar.es ? String(t[capilar.title]) : view.label;
  const plastic = (PLASTIC_VIEW_KEYS as readonly string[]).indexOf(base);
  if (plastic >= 0) return view.label === PLASTIC_TEXT.es.photos[plastic][0] ? PLASTIC_TEXT[lang].photos[plastic][0] : view.label;
  return view.label;
}

/** Phase events change the patient's status on the server: refresh the lists, counters and filters too. */
export const refreshLeadViews = (queryClient: { invalidateQueries: (filters: { predicate: (query: { queryKey: readonly unknown[] }) => boolean }) => Promise<void> | void }) =>
  queryClient.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === "string" && (query.queryKey[0] as string).startsWith("/api/leads") });

/** Menu labels of the staff panel that did not have a translation yet. */
export const NAV_TEXT: Record<LangCode, { report: string; language: string }> = {
  es: { report: "Informe", language: "Idioma" },
  en: { report: "Report", language: "Language" },
  pt: { report: "Relatório", language: "Idioma" },
  fr: { report: "Rapport", language: "Langue" },
  de: { report: "Bericht", language: "Sprache" },
  it: { report: "Report", language: "Lingua" },
  tr: { report: "Rapor", language: "Dil" },
  ar: { report: "التقرير", language: "اللغة" },
  zh: { report: "报告", language: "语言" },
};
