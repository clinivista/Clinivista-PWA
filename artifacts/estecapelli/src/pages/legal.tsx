import type { ReactNode } from "react";
import { Link } from "wouter";

// Datos de contacto que aparecen en las páginas legales. Cambia el correo aquí
// si la plataforma pasa a usar uno propio (por ejemplo contacto@clinivista.cl).
export const LEGAL_CONTACT_EMAIL = "jfferraezhp7@gmail.com";
const UPDATED = "8 de octubre de 2026";

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#F5F2EE] px-4 py-10 flex justify-center">
      <article className="w-full max-w-2xl flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">Clinivista · Última actualización: {UPDATED}</p>
        </header>
        {children}
        <nav className="flex gap-4 pt-4 text-xs text-muted-foreground border-t border-[#E8E4DE]" aria-label="Documentos legales">
          <Link href="/privacidad" className="underline">Política de privacidad</Link>
          <Link href="/terminos" className="underline">Términos de servicio</Link>
        </nav>
      </article>
    </div>
  );
}

const H = ({ children }: { children: ReactNode }) => <h2 className="text-lg font-bold mt-2">{children}</h2>;

export function Privacy() {
  return (
    <Page title="Política de privacidad">
      <p>
        Clinivista es una plataforma que las clínicas usan para recibir las fotografías y los datos de sus pacientes, evaluarlos y
        enviarles sus resultados. Esta política explica qué datos se recogen, para qué se usan y cuáles son tus derechos.
      </p>

      <H>Quién es responsable de tus datos</H>
      <p>
        La clínica a la que le envías tu evaluación es la responsable de tus datos clínicos y decide para qué se usan.
        Clinivista actúa por encargo de esa clínica: almacena y procesa los datos solo para prestarle el servicio, y no los usa para
        otros fines.
      </p>

      <H>Qué datos recogemos</H>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Datos de identificación y contacto: nombre, RUT, teléfono, correo electrónico, edad y ciudad.</li>
        <li>Datos de salud que tú entregas: antecedentes, síntomas y las fotografías que subes en tu evaluación.</li>
        <li>El diagnóstico y la respuesta que el equipo médico de la clínica prepara para ti, incluidas las fotografías con sus indicaciones.</li>
        <li>Si entras con Google: solo tu nombre y tu correo verificado. No accedemos a tu correo, contactos, archivos ni a ningún otro dato de tu cuenta de Google.</li>
        <li>Datos técnicos mínimos necesarios para el funcionamiento y la seguridad del servicio (por ejemplo, registros de acceso).</li>
      </ul>

      <H>Para qué los usamos</H>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Que la clínica evalúe tu caso y te responda.</li>
        <li>Enviarte tus resultados por correo, por WhatsApp o mediante tu cuenta.</li>
        <li>Crear y proteger tu cuenta, para que solo tú veas tus resultados.</li>
        <li>Mantener la seguridad del servicio y cumplir obligaciones legales.</li>
      </ul>
      <p>Solo te contactaremos con fines comerciales si lo autorizaste expresamente al registrarte.</p>

      <H>Con quién se comparten</H>
      <p>
        No vendemos tus datos. Pueden acceder a ellos el equipo autorizado de la clínica que te atiende y los proveedores técnicos que
        permiten que el servicio funcione: alojamiento de la aplicación y base de datos, almacenamiento privado de fotografías, envío de
        correos y acceso con Google. Estos proveedores solo procesan los datos para prestar su servicio.
      </p>
      <p>
        Los resultados se envían a través del medio que elijas. Quien tenga el enlace que te enviamos puede abrir tu informe, así que no lo
        compartas. Los enlaces vencen a los 30 días; en tu cuenta puedes volver a descargarlos.
      </p>

      <H>Cómo los protegemos</H>
      <p>
        Las fotografías se guardan en almacenamiento privado, la comunicación viaja cifrada y el acceso del personal requiere una cuenta
        autorizada que solo ve los pacientes de su propia clínica. Ningún sistema es infalible, pero aplicamos medidas razonables para
        reducir los riesgos.
      </p>

      <H>Cuánto tiempo los conservamos</H>
      <p>
        Los datos se conservan mientras la clínica los necesite para tu atención y para cumplir sus obligaciones, o hasta que se
        eliminen a tu solicitud, cuando la ley lo permita.
      </p>

      <H>Tus derechos</H>
      <p>
        Puedes pedir acceso a tus datos, su rectificación, su eliminación y oponerte a ciertos usos, de acuerdo con la Ley N.º 19.628
        sobre protección de la vida privada y las normas que la reemplacen. Escribe a la clínica que te atiende o a{" "}
        <a className="underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>, y gestionaremos tu solicitud con la clínica.
      </p>

      <H>Cambios en esta política</H>
      <p>Si la actualizamos, publicaremos aquí la nueva versión con su fecha.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Términos de servicio">
      <p>Al usar Clinivista aceptas estos términos. Si no estás de acuerdo, no uses el servicio.</p>

      <H>El servicio</H>
      <p>
        Clinivista permite a una clínica recibir tus fotografías y datos, evaluarlos y enviarte una respuesta. Tú envías tu evaluación a
        una clínica determinada y es ella quien te atiende; Clinivista solo provee la plataforma.
      </p>

      <H>No es una consulta médica de urgencia</H>
      <p>
        La respuesta que recibes se basa en las fotografías y los datos que enviaste y no reemplaza una consulta presencial. Para
        confirmar el diagnóstico y definir un tratamiento, la clínica puede pedirte una evaluación en persona. Si tienes una urgencia
        médica, acude a un servicio de urgencia.
      </p>

      <H>Tu cuenta y tus datos</H>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Debes ser mayor de edad y entregar información verdadera.</li>
        <li>Eres responsable de mantener segura tu clave o tu cuenta de Google, y de no compartir los enlaces con tus resultados.</li>
        <li>Debes enviar solo fotografías tuyas, o de una persona que te haya autorizado.</li>
      </ul>

      <H>Uso adecuado</H>
      <p>
        No puedes usar el servicio para fines ilegales, intentar acceder a datos de otras personas, ni interferir con su funcionamiento.
        Podemos suspender cuentas que incumplan estos términos.
      </p>

      <H>Privacidad</H>
      <p>
        El tratamiento de tus datos se explica en la <Link href="/privacidad" className="underline">política de privacidad</Link>.
      </p>

      <H>Responsabilidad</H>
      <p>
        Hacemos lo razonable para que el servicio funcione de forma continua y segura, pero no garantizamos que esté libre de
        interrupciones. Las decisiones médicas y su resultado son responsabilidad de la clínica y de sus profesionales.
      </p>

      <H>Propiedad intelectual</H>
      <p>
        La plataforma y su marca pertenecen a Clinivista. Tus fotografías y datos siguen siendo tuyos; nos autorizas, a nosotros y a la
        clínica que elijas, a usarlos para prestar el servicio descrito.
      </p>

      <H>Cambios y ley aplicable</H>
      <p>
        Podemos actualizar estos términos y publicaremos aquí la versión vigente. Se rigen por las leyes de Chile. Para consultas,
        escribe a <a className="underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </Page>
  );
}
