import { locales, type Locale } from "@/lib/site";

type Localized = readonly [string, string, string, string];
const translate = (locale: Locale, value: Localized) => value[locales.indexOf(locale)];

const labels = {
  skip: ["Skip to content", "انتقل إلى المحتوى", "К основному содержанию", "Saltar al contenido"],
  search: ["Product, SKU or topic", "منتج أو رمز أو موضوع", "Продукт, артикул или тема", "Producto, SKU o tema"],
  choose: ["Tell us your requirements", "أخبرنا بمتطلباتك", "Укажите ваши требования", "Indique sus requisitos"],
  compare: ["See selection criteria", "راجع معايير الاختيار", "Критерии выбора", "Ver criterios de selección"],
  guide: ["Selection guide", "دليل الاختيار", "Руководство по выбору", "Guía de selección"],
  faq: ["Selection questions", "أسئلة الاختيار", "Вопросы по выбору", "Preguntas de selección"],
  download: ["Download technical files", "نزّل الملفات الفنية", "Скачать технические файлы", "Descargar documentación técnica"],
  request: ["Request technical documents", "اطلب الوثائق الفنية", "Запросить документацию", "Solicitar documentación técnica"],
  notes: ["Technical reference", "مرجع فني", "Технический источник", "Referencia técnica"],
  forResearch: ["Confirm the final SKU and its documentation with MAIGE before ordering.", "أكّد رمز المنتج ووثائقه مع MAIGE قبل الطلب.", "Перед заказом уточните артикул и документацию у MAIGE.", "Confirme la referencia final y su documentación con MAIGE antes de pedir."],
  fallback: ["Product information is shown in English while the translation is being prepared.", "تُعرض معلومات المنتج بالإنجليزية إلى أن تكتمل ترجمتها.", "До завершения перевода сведения представлены на английском.", "La información se muestra en inglés mientras se prepara la traducción."],
} as const satisfies Record<string, Localized>;

const guides = {
  "dialysis-tubing": {
    criteria: [
      ["Use the molecular weights of the retained sample and the solute to shortlist the MWCO, then confirm retention under your conditions.", "استخدم أوزان العينة المراد الاحتفاظ بها والمذاب لتحديد MWCO ثم تحقّق من الاحتجاز في ظروفك.", "Подберите порог MWCO по молекулярной массе образца и удаляемого вещества и подтвердите удержание в ваших условиях.", "Preseleccione el MWCO según la masa molecular de la muestra retenida y del soluto, y confirme la retención en sus condiciones."],
      ["Check membrane compatibility with the sample, buffer and operating conditions.", "تحقّق من توافق الغشاء مع العينة والمحلول المنظّم وظروف التشغيل.", "Проверьте совместимость мембраны с образцом, буфером и условиями работы.", "Compruebe la compatibilidad de la membrana con la muestra, el tampón y las condiciones de trabajo."],
      ["Specify the sample volume and closure format when comparing tubing width or diameter.", "حدّد حجم العينة ونوع الإغلاق عند مقارنة عرض الأنبوب أو قطره.", "Укажите объём образца и тип зажима при сравнении ширины или диаметра трубок.", "Indique el volumen de muestra y el tipo de cierre al comparar el ancho o el diámetro."],
      ["Ask for usable length, pack size, preparation and storage instructions for the proposed SKU.", "اطلب الطول القابل للاستخدام وحجم العبوة وتعليمات التحضير والتخزين للمنتج المقترح.", "Запросите полезную длину, фасовку и указания по подготовке и хранению выбранного артикула.", "Solicite longitud útil, tamaño de envase e instrucciones de preparación y almacenamiento de la referencia propuesta."],
    ],
    question: ["What should I send for a dialysis tubing quote?", "ما المعلومات اللازمة لطلب عرض لأنابيب الديال؟", "Что указать в запросе на диализные трубки?", "¿Qué debo enviar para cotizar tubos de diálisis?"],
    answer: ["Include the target and solute molecular weights, sample volume, buffer, required MWCO if known, and quantity. Confirm recovery in a trial before scaling the process.", "أرسل الأوزان الجزيئية وحجم العينة والمحلول المنظّم وMWCO المطلوب إن كان معروفًا والكمية. تحقّق من الاسترداد بتجربة قبل التوسّع.", "Укажите молекулярные массы, объём образца, буфер, требуемый MWCO и количество. Проверьте выход в пробном опыте перед масштабированием.", "Indique las masas moleculares, el volumen de muestra, el tampón, el MWCO si lo conoce y la cantidad. Compruebe la recuperación con una prueba antes de escalar."],
    source: { label: "Repligen · Dialysis FAQ", href: "https://www.repligen.com/products/dialysis/faq-dialysis" },
  },
  "elisa-kits": {
    criteria: [
      ["Provide the target analyte and an identifier or synonym when the name is ambiguous.", "أرسل اسم المادة المستهدفة ومعرّفًا أو مرادفًا عند الالتباس.", "Укажите определяемый аналит и идентификатор или синоним при неоднозначном названии.", "Indique el analito y un identificador o sinónimo si el nombre es ambiguo."],
      ["Confirm the validated species for the proposed kit.", "تحقّق من الأنواع التي جرى التحقق من صلاحية الطقم لها.", "Проверьте вид, для которого валидирован предлагаемый набор.", "Confirme la especie validada para el kit propuesto."],
      ["Check the validated sample matrix, expected concentration, dilution and assay range in the kit instructions.", "راجع نوع العينة المعتمد والتركيز المتوقع والتخفيف ومدى القياس في تعليمات الطقم.", "Проверьте матрицу образца, ожидаемую концентрацию, разведение и диапазон измерения в инструкции.", "Revise la matriz validada, la concentración esperada, la dilución y el rango de medición en las instrucciones."],
      ["Confirm plate format, samples per run and controls before comparing kits or pack sizes.", "أكّد نوع الصفيحة وعدد العينات في التشغيل والضوابط قبل مقارنة الأطقم أو أحجام العبوات.", "Уточните формат планшета, число образцов за запуск и контроли перед сравнением наборов.", "Confirme el formato de placa, las muestras por tanda y los controles antes de comparar kits o envases."],
    ],
    question: ["How can I compare two kits for the same target?", "كيف أقارن طقمين للهدف نفسه؟", "Как сравнить два набора для одного аналита?", "¿Cómo comparo dos kits para la misma diana?"],
    answer: ["Compare validated species and matrices, assay range, sensitivity, sample volume and the protocol for each exact SKU. Ask for the instructions before committing to a kit.", "قارن الأنواع والعينات المعتمدة ومدى القياس والحساسية وحجم العينة وبروتوكول كل طقم. اطلب التعليمات قبل الاختيار.", "Сравните валидированные виды и матрицы, диапазон, чувствительность, объём образца и протокол каждого артикула. Запросите инструкции до выбора.", "Compare las especies y matrices validadas, rango, sensibilidad, volumen de muestra y protocolo de cada referencia. Solicite las instrucciones antes de elegir."],
    source: { label: "Thermo Fisher · ELISA documentation example", href: "https://www.thermofisher.com/elisa/product/Human-IL-6-ELISA-Kit/EH2IL6" },
  },
  "lab-consumables": {
    criteria: [
      ["For cell strainers, compare mesh size with the particle or cell size you want to pass or retain.", "لمصافي الخلايا، قارن فتحات الشبكة بحجم الجسيمات أو الخلايا المطلوب تمريرها أو احتجازها.", "Для клеточных фильтров сопоставьте ячейку сетки с размером пропускаемых или задерживаемых клеток или частиц.", "En filtros celulares, compare la abertura de malla con el tamaño de las células o partículas que desea pasar o retener."],
      ["Check the tube, holder or instrument format and the sample volume.", "تحقّق من نوع الأنبوب أو الحامل أو الجهاز وحجم العينة.", "Проверьте формат пробирки, держателя или прибора и объём образца.", "Compruebe el formato del tubo, soporte o instrumento y el volumen de muestra."],
      ["State whether individual wrapping, sterile supply or a specific pack quantity is required.", "اذكر ما إذا كنت تحتاج تغليفًا منفردًا أو توريدًا معقمًا أو كمية محددة في العبوة.", "Укажите требования к индивидуальной упаковке, стерильности и количеству в упаковке.", "Indique si requiere envoltorio individual, suministro estéril o una cantidad específica por envase."],
      ["Check the exact consumable against your sample, tube and protocol before bulk ordering.", "تحقّق من توافق المستهلك المحدد مع عينتك وأنبوبك وبروتوكولك قبل الطلب بالجملة.", "Перед оптовым заказом проверьте совместимость расходника с образцом, пробиркой и протоколом.", "Compruebe la compatibilidad del consumible con su muestra, tubo y protocolo antes de pedir en volumen."],
    ],
    question: ["What should I check before ordering cell strainers?", "ما الذي يجب التحقق منه قبل طلب مصافي الخلايا؟", "Что проверить перед заказом клеточных фильтров?", "¿Qué compruebo antes de pedir filtros celulares?"],
    answer: ["Provide the sample type, mesh requirement, tube format and quantity. Confirm fit and sample recovery in your workflow before purchasing in bulk.", "أرسل نوع العينة ومتطلبات الشبكة ونوع الأنبوب والكمية. تحقّق من الملاءمة واسترداد العينة قبل الشراء بالجملة.", "Укажите тип образца, размер ячейки, формат пробирки и количество. Перед оптовой закупкой проверьте посадку и выход образца.", "Indique el tipo de muestra, la malla, el formato de tubo y la cantidad. Confirme el ajuste y la recuperación antes de comprar en volumen."],
    source: { label: "Corning · Cell strainer selection", href: "https://www.corning.com/emea/en/products/life-sciences/resources/webforms/cell-strainers-sample-request.html" },
  },
} as const satisfies Record<string, { criteria: readonly Localized[]; question: Localized; answer: Localized; source: { label: string; href: string } }>;

export function procurementLabel(locale: Locale, key: keyof typeof labels) {
  return translate(locale, labels[key]);
}

export function selectionGuide(locale: Locale, family: string) {
  if (!Object.hasOwn(guides, family)) return undefined;
  const guide = guides[family as keyof typeof guides];
  return {
    criteria: guide.criteria.map((item) => translate(locale, item)),
    question: translate(locale, guide.question),
    answer: translate(locale, guide.answer),
    source: guide.source,
  };
}

const applicationSummaries = {
  "protein-research": [
    "Plan protein sample preparation and buffer exchange. Compare membrane cutoff, sample volume and recovery before choosing dialysis tubing.",
    "خطّط لتحضير عينات البروتين وتبادل المحلول المنظّم. قارن حد الغشاء وحجم العينة والاسترداد قبل اختيار أنابيب الديال.",
    "Спланируйте подготовку белковых проб и смену буфера. Сравните порог мембраны, объём образца и выход перед выбором трубок.",
    "Planifique la preparación de proteínas y el intercambio de tampón. Compare el corte de membrana, el volumen y la recuperación.",
  ],
  immunology: [
    "Plan an immunology assay by confirming the target, species and sample matrix before choosing an ELISA kit and checking its protocol.",
    "خطّط لاختبار المناعة بتأكيد الهدف والنوع ومصفوفة العينة قبل اختيار طقم ELISA والتحقق من بروتوكوله.",
    "Спланируйте иммунологический анализ. Уточните аналит, вид и матрицу образца перед выбором набора ELISA и проверкой протокола.",
    "Planifique un ensayo de inmunología confirmando el analito, la especie y la matriz antes de elegir un kit ELISA y revisar su protocolo.",
  ],
  "molecular-biology": [
    "Prepare samples for molecular biology workflows. Check sample volume, filtration requirements and tube compatibility before selecting laboratory consumables.",
    "حضّر العينات لسير عمل البيولوجيا الجزيئية. تحقّق من حجم العينة ومتطلبات الترشيح وتوافق الأنابيب قبل اختيار المستهلكات.",
    "Подготовьте пробы для молекулярной биологии. Уточните объём, требования к фильтрации и совместимость пробирок перед выбором расходников.",
    "Prepare muestras para biología molecular. Compruebe el volumen, la filtración y la compatibilidad con tubos antes de elegir consumibles.",
  ],
  "biopharmaceutical-research": [
    "Document biopharmaceutical research requirements for buffer exchange or immunoassays, from sample conditions to product documentation and scale-up.",
    "وثّق احتياجات أبحاث المستحضرات الحيوية لتبادل المحلول أو الاختبارات المناعية، من ظروف العينة إلى وثائق المنتج والتوسّع.",
    "Зафиксируйте требования биофармацевтического исследования к смене буфера или иммуноанализу, от условий проб до документации и масштабирования.",
    "Documente los requisitos biofarmacéuticos para intercambio de tampón o inmunoensayos, desde las condiciones de muestra hasta la documentación y el escalado.",
  ],
} as const satisfies Record<string, Localized>;

export function applicationSummary(locale: Locale, slug: keyof typeof applicationSummaries) {
  return translate(locale, applicationSummaries[slug]);
}
