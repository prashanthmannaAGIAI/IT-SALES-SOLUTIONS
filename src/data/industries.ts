export interface IndustryCategory {
  slug: string;
  name: string;
}

export interface Industry {
  slug: string;
  name: string;
  category: string;
  icon: string;
  focus: string;
  summary: string;
  introduction: string;
  keywords: string[];
  systems: string[];
  challenges: string[];
  opportunities: string[];
  agents: string[];
  services: string[];
  integrations: string[];
  safeguards: string[];
  example: string;
}

interface IndustryProfile {
  icon: string;
  asset: string;
  workflow: string;
  insight: string;
  agent: string;
  knowledge: string;
  systems: string[];
  challenges: string[];
  opportunities: string[];
  agents: string[];
  services: string[];
  safeguards: string[];
}

export const industryCategories: IndustryCategory[] = [
  { slug: "health-life-sciences", name: "Health & life sciences" },
  { slug: "financial-services", name: "Financial services" },
  { slug: "industrial-infrastructure", name: "Industry & infrastructure" },
  { slug: "public-sector", name: "Government & public services" },
  { slug: "transport-logistics", name: "Transport & supply chains" },
  { slug: "consumer-services", name: "Consumer & services" },
  { slug: "built-environment", name: "Built environment" },
  { slug: "digital-professional", name: "Digital & professional services" },
  { slug: "food-natural-resources", name: "Food & natural resources" },
  { slug: "research-community", name: "Research, sport & community" },
];

const profiles: Record<string, IndustryProfile> = {
  "health-life-sciences": {
    icon: "shield",
    asset: "clinical, research or product information",
    workflow: "administrative coordination and approved knowledge retrieval",
    insight: "reviewable operational and research information",
    agent: "health-information support",
    knowledge: "organization-approved, non-diagnostic material",
    systems: ["Electronic health records or laboratory information systems", "Practice, research, quality or regulatory platforms", "Identity, consent and document-management systems"],
    challenges: [
      "Protecting sensitive patient, participant and product information across teams and platforms.",
      "Keeping research, quality and clinical information current, traceable and appropriately reviewed.",
      "Introducing tools without disrupting care, research integrity or regulated operating processes.",
    ],
    opportunities: [
      "Help authorized staff find approved guidance and source documents more quickly.",
      "Prepare summaries or structured administrative drafts for qualified human review.",
      "Streamline non-clinical coordination and quality-document workflows with explicit checkpoints.",
    ],
    agents: [
      "A permission-aware knowledge assistant that answers from approved documents and shows its sources.",
      "An administrative workflow agent that drafts a hand-off or records checklist for staff approval.",
      "A document-intake workflow that classifies submissions for review without making care or research decisions.",
    ],
    services: ["generative-ai", "ai-agents", "cybersecurity", "data-analytics", "cloud-devops"],
    safeguards: [
      "Do not use a general assistant for diagnosis, treatment, clinical triage or unsupervised medical-device functions.",
      "Assess health-data privacy, residency, consent, retention and access requirements with qualified specialists.",
      "Validate research, clinical and product workflows against applicable approvals, safety processes and regulations.",
      "Keep professional responsibility, audit records and human review explicit; this directory is not medical advice.",
    ],
  },
  "financial-services": {
    icon: "layers",
    asset: "financial, transaction and customer information",
    workflow: "customer-service, reporting and controlled operational review",
    insight: "traceable operational and transaction information",
    agent: "financial-operations support",
    knowledge: "approved internal procedures and permitted records",
    systems: ["Core banking, policy or payment platforms", "CRM, case management and finance systems", "Identity, fraud-monitoring and audit platforms"],
    challenges: [
      "Maintaining confidentiality and traceability across customer, policy, account or transaction data.",
      "Handling exceptions and sensitive decisions with clear ownership and escalation.",
      "Connecting new workflows to core platforms without weakening existing controls.",
    ],
    opportunities: [
      "Give authorized teams source-linked access to approved procedures and product information.",
      "Prepare operational summaries, reconciliations or case notes for accountable staff review.",
      "Route routine service requests and flag incomplete information for human follow-up.",
    ],
    agents: [
      "A read-only policy or procedure assistant with source citations and role-based access.",
      "A case-preparation workflow that gathers permitted context and drafts a reviewable staff summary.",
      "A payment or reconciliation exception-routing agent that suggests a queue but never authorizes transactions.",
    ],
    services: ["cybersecurity", "data-analytics", "ai-agents", "generative-ai", "cloud-devops"],
    safeguards: [
      "No autonomous lending, underwriting, investment, payment authorization, financial advice or adverse decisions.",
      "Review financial-services, consumer-protection, AML/KYC, payment and records obligations with qualified specialists.",
      "Use least privilege, strong identity controls, audit trails, encryption and tested incident-response procedures.",
      "Assess data residency, vendor access, model retention and cross-border processing before any sensitive data use.",
    ],
  },
  "industrial-infrastructure": {
    icon: "network",
    asset: "asset, engineering and operational information",
    workflow: "maintenance, quality and controlled operational coordination",
    insight: "reviewable asset, quality and service information",
    agent: "operations-information support",
    knowledge: "approved procedures and non-control-system records",
    systems: ["ERP, maintenance and asset-management platforms", "MES, quality and industrial data historians", "Identity, document control and monitoring tools"],
    challenges: [
      "Making reliable information available across sites, assets, teams and older operational systems.",
      "Managing operational exceptions without disrupting production, safety or continuity.",
      "Separating business IT, cloud services and operational technology with clear control boundaries.",
    ],
    opportunities: [
      "Organize approved maintenance, engineering and quality documents for faster staff reference.",
      "Summarize non-control operational data to support human-led planning and investigation.",
      "Automate administrative hand-offs, service reporting and quality-record preparation.",
    ],
    agents: [
      "A read-only maintenance knowledge assistant that retrieves approved procedures and asset documents.",
      "A work-order preparation agent that drafts context and routes it to an authorized planner.",
      "A quality-document workflow that checks for missing fields and requests human review before submission.",
    ],
    services: ["cloud-devops", "cybersecurity", "data-analytics", "ai-agents", "it-consulting"],
    safeguards: [
      "Do not connect generative AI or agents to safety systems, industrial controls or equipment actuation.",
      "Require operational-technology security review, segmentation, change control and site-specific hazard assessment.",
      "Validate engineering, quality and environmental obligations with qualified domain and compliance personnel.",
      "Plan for offline or degraded connectivity, rollback, incident response and accountable human supervision.",
    ],
  },
  "public-sector": {
    icon: "globe",
    asset: "public-service, resident and policy information",
    workflow: "service-request handling and approved administrative coordination",
    insight: "accessible service and program information",
    agent: "public-service navigation support",
    knowledge: "published or explicitly approved service guidance",
    systems: ["Case management and digital-service platforms", "Records, identity and document-management systems", "Geospatial, planning or operational information systems"],
    challenges: [
      "Delivering accessible and consistent services across agencies, channels and communities.",
      "Maintaining transparent records, accountable decisions and reliable public information.",
      "Meeting procurement, data-location, accessibility and jurisdiction-specific requirements.",
    ],
    opportunities: [
      "Help staff locate current approved policies, service procedures and public information.",
      "Triage routine administrative requests for human review with clear routing and status.",
      "Improve accessibility and consistency of draft communications while retaining staff approval.",
    ],
    agents: [
      "A grounded public-information assistant that uses approved sources and directs complex cases to staff.",
      "A service-request intake agent that identifies missing information and routes the request for review.",
      "A document workflow that prepares a traceable draft response for an authorized official to approve.",
    ],
    services: ["generative-ai", "ai-agents", "cybersecurity", "software-development", "cloud-devops"],
    safeguards: [
      "Do not automate eligibility, enforcement, benefits or other consequential public decisions without authorization.",
      "Assess applicable privacy, records, accessibility, procurement, data residency and public-sector requirements.",
      "Keep service pathways inclusive, auditable and available to people who do not use AI-enabled channels.",
      "Obtain agency security, legal, data-governance and procurement approvals before handling protected information.",
    ],
  },
  "transport-logistics": {
    icon: "layers",
    asset: "shipment, fleet, routing and partner information",
    workflow: "shipment exceptions, dispatch coordination and status communication",
    insight: "timely supply-chain and service-status information",
    agent: "logistics-coordination support",
    knowledge: "approved schedules, service rules and shipment records",
    systems: ["Transport, warehouse and fleet-management platforms", "ERP, order, customs or partner EDI systems", "Mapping, telematics and customer-service platforms"],
    challenges: [
      "Reconciling status across carriers, warehouses, fleets, customer channels and external partners.",
      "Coordinating exceptions when timing, inventory, route or hand-off information changes.",
      "Protecting location, shipment and personal information while maintaining operational continuity.",
    ],
    opportunities: [
      "Consolidate approved status information to help teams understand delays and exceptions.",
      "Prepare dispatch or customer-service updates for staff review using current source data.",
      "Automate routine document checks and route incomplete or unusual cases to an operator.",
    ],
    agents: [
      "A shipment-status assistant that retrieves authorized tracking information and explains its source.",
      "An exception-intake agent that classifies a delay and prepares a suggested, reviewable hand-off.",
      "A logistics-document workflow that checks required fields before staff submit or release paperwork.",
    ],
    services: ["data-analytics", "software-development", "ai-agents", "cloud-devops", "cybersecurity"],
    safeguards: [
      "Keep routing, dispatch, vehicle control, cargo release and safety-critical actions under authorized human control.",
      "Review customs, trade, transport, aviation, maritime and jurisdiction-specific requirements where applicable.",
      "Minimize location and customer data; secure partner integrations and establish access and retention rules.",
      "Test stale, missing, conflicting and delayed source data, including fallback and escalation behavior.",
    ],
  },
  "consumer-services": {
    icon: "message",
    asset: "customer, product and service information",
    workflow: "customer enquiries, service operations and content preparation",
    insight: "consistent customer-service and product information",
    agent: "customer-service knowledge support",
    knowledge: "approved product, service and customer-support information",
    systems: ["CRM, customer-support and contact-center platforms", "Commerce, booking, content or loyalty systems", "Product catalogues, consent and communication platforms"],
    challenges: [
      "Keeping service information accurate and consistent across channels and customer-facing teams.",
      "Managing changing demand, complex enquiries and hand-offs to people who can resolve them.",
      "Using customer information responsibly while integrating multiple service platforms.",
    ],
    opportunities: [
      "Help staff find approved product, booking, policy or service guidance during an enquiry.",
      "Draft routine responses and summaries for staff approval, with an obvious escalation to a person.",
      "Organize feedback and operational themes without treating automated interpretation as a final decision.",
    ],
    agents: [
      "A customer-service copilot that drafts source-grounded replies for an employee to review and send.",
      "An enquiry-intake workflow that gathers required context and routes specialist requests.",
      "A product or booking assistant that answers from approved catalogue data and hands off exceptions.",
    ],
    services: ["generative-ai", "ai-agents", "software-development", "data-analytics", "cloud-devops", "cybersecurity"],
    safeguards: [
      "Make it clear when users are interacting with automation and provide a practical human-support route.",
      "Review consumer-protection, accessibility, advertising, content and personal-data obligations by jurisdiction.",
      "Protect payment details, credentials and customer records; limit what assistants can access or retain.",
      "Require human approval for refunds, contractual changes, eligibility, bookings or other consequential actions.",
    ],
  },
  "built-environment": {
    icon: "code",
    asset: "property, project and building information",
    workflow: "document review, project coordination and property-service requests",
    insight: "current project, property and facilities information",
    agent: "project-information support",
    knowledge: "approved drawings, specifications and facilities documentation",
    systems: ["BIM, CAD, project and document-control platforms", "Property, facilities and asset-management systems", "ERP, procurement, building-management and identity systems"],
    challenges: [
      "Coordinating changing project, property and building records across disciplines and suppliers.",
      "Maintaining document versions, approvals, permissions and a reliable record of decisions.",
      "Working across sites and legacy building systems with distinct safety and connectivity needs.",
    ],
    opportunities: [
      "Find approved drawings, specifications, project records and facilities guidance by role.",
      "Prepare reviewable summaries of project correspondence, requests and document changes.",
      "Route maintenance or project requests with structured information and clear accountability.",
    ],
    agents: [
      "A project-document assistant that retrieves approved files and identifies the source and revision.",
      "A facilities-intake agent that categorizes requests and prepares a work-order draft for staff.",
      "A meeting-to-actions workflow that drafts owners and follow-ups for participants to confirm.",
    ],
    services: ["software-development", "cloud-devops", "data-analytics", "ai-agents", "cybersecurity"],
    safeguards: [
      "Do not let AI alter engineering designs, approve construction, direct building controls or certify safety.",
      "Require qualified engineering, fire, building-code and site safety review for regulated or critical work.",
      "Control access to sensitive plans, tenant data and connected-building systems; log and review changes.",
      "Agree document ownership, revision control, supplier access and retention before connecting project sources.",
    ],
  },
  "digital-professional": {
    icon: "code",
    asset: "digital-product, business and professional information",
    workflow: "knowledge retrieval, case preparation and document administration",
    insight: "reviewable service, delivery and business information",
    agent: "professional-workflow support",
    knowledge: "approved work-product and organizational knowledge",
    systems: ["CRM, ERP, case and practice-management platforms", "Code, content, project and document repositories", "HR, marketing, analytics and identity platforms"],
    challenges: [
      "Managing fast-changing knowledge, distributed teams, intellectual property and complex toolchains.",
      "Maintaining confidentiality, quality and accountable review across service and content workflows.",
      "Integrating specialist platforms without disrupting established professional processes.",
    ],
    opportunities: [
      "Make approved internal knowledge easier to discover with source references and access controls.",
      "Prepare drafts, structured summaries and workflow hand-offs for qualified professional review.",
      "Reduce repetitive administrative work while preserving ownership, version history and approval.",
    ],
    agents: [
      "A repository-aware assistant that answers questions from approved, permission-controlled material.",
      "A document-intake workflow that extracts requested fields and flags uncertain information for review.",
      "A bounded project or case assistant that drafts next steps but leaves advice and decisions to professionals.",
    ],
    services: ["generative-ai", "software-development", "ai-agents", "data-analytics", "cybersecurity", "cloud-devops"],
    safeguards: [
      "Do not represent generated material as legal advice, an audit opinion, an HR decision or specialist certification.",
      "Protect client, employee, candidate and commercially sensitive information with least-privilege access.",
      "Obtain professional, employment, intellectual-property and sector-specific approval where required.",
      "Track sources and changes; require accountable review before advice, publication, hiring or contractual action.",
    ],
  },
  "food-natural-resources": {
    icon: "spark",
    asset: "production, sourcing and environmental information",
    workflow: "quality checks, supplier coordination and production administration",
    insight: "traceable sourcing, production and resource information",
    agent: "supply-and-quality information support",
    knowledge: "approved procedures, supplier records and non-control data",
    systems: ["ERP, procurement, inventory and supplier platforms", "Quality, laboratory and traceability systems", "Farm, geospatial, environmental or production records"],
    challenges: [
      "Connecting supplier, production, quality and traceability records across fragmented operations.",
      "Working with variable conditions, site connectivity and time-sensitive product information.",
      "Maintaining a trustworthy record of origin, quality checks and environmental or resource data.",
    ],
    opportunities: [
      "Find approved supplier, quality and operating guidance with relevant source records.",
      "Prepare traceability or quality documentation for an authorized person to verify.",
      "Summarize approved operational data to support planning without replacing expert judgement.",
    ],
    agents: [
      "A supplier-document assistant that flags missing or expiring records for staff review.",
      "A traceability workflow that assembles source-linked batch or sourcing information for verification.",
      "A field or quality-reporting assistant that drafts structured notes for an authorized specialist.",
    ],
    services: ["data-analytics", "cloud-devops", "ai-agents", "software-development", "cybersecurity"],
    safeguards: [
      "Do not use generated advice as a substitute for food safety, environmental, agricultural or engineering expertise.",
      "Review applicable food, product, export, environmental and worker-safety obligations with qualified specialists.",
      "Protect supplier, worker and location data; document data origin, permissions, quality and retention.",
      "Keep control of machinery, irrigation, dosing and other physical processes outside AI-agent authority.",
    ],
  },
  "research-community": {
    icon: "brain",
    asset: "research, participant, athlete or community information",
    workflow: "program coordination, approved knowledge retrieval and reporting preparation",
    insight: "reviewable research, participation and program information",
    agent: "research-and-program support",
    knowledge: "approved non-sensitive guidance and authorized records",
    systems: ["Research, learning and records-management platforms", "Membership, program, event or case systems", "Consent, identity, analytics and collaboration tools"],
    challenges: [
      "Protecting participant, member and research information across programs and collaborating organizations.",
      "Keeping evidence, program guidance and records current, attributable and understandable.",
      "Supporting varied communities while maintaining accessibility, consent and accountable oversight.",
    ],
    opportunities: [
      "Help authorized teams locate approved program, research or participation guidance.",
      "Prepare structured administrative and reporting drafts for domain-expert review.",
      "Automate routine coordination and improve access to public information with clear human support.",
    ],
    agents: [
      "A source-linked research or program assistant limited to approved documents and audience permissions.",
      "An event, membership or volunteer workflow that prepares reminders and hand-offs for staff approval.",
      "A reporting assistant that drafts from authorized, appropriately aggregated information for review.",
    ],
    services: ["data-analytics", "generative-ai", "ai-agents", "software-development", "cloud-devops", "cybersecurity"],
    safeguards: [
      "Do not treat automated analysis as scientific evidence, medical advice, athlete selection or eligibility decisions.",
      "Obtain applicable research ethics, consent, safeguarding, accessibility and privacy approvals before use.",
      "Minimize identifiable data and protect vulnerable participants, minors, volunteers and community members.",
      "Ensure research integrity, source traceability, human accountability and accessible non-automated alternatives.",
    ],
  },
};

interface IndustryDefinition {
  slug: string;
  name: string;
  category: string;
  focus: string;
  keywords: string;
  systems?: string[];
}

const definitions: IndustryDefinition[] = [
  { slug: "healthcare", name: "Healthcare", category: "health-life-sciences", focus: "care delivery, patient administration and health information", keywords: "health care medical provider clinical", systems: ["Electronic health records and clinical information systems", "Patient administration, scheduling and practice systems"] },
  { slug: "hospitals", name: "Hospitals", category: "health-life-sciences", focus: "multi-department hospital operations and care coordination", keywords: "acute care inpatient", systems: ["Hospital information and patient administration systems", "Laboratory, imaging, pharmacy and workforce platforms"] },
  { slug: "clinics", name: "Clinics", category: "health-life-sciences", focus: "clinic appointments, patient administration and practice workflows", keywords: "primary care outpatient medical centre", systems: ["Practice management and appointment platforms", "Electronic health records and billing systems"] },
  { slug: "digital-health", name: "Digital health", category: "health-life-sciences", focus: "digital health products, remote services and user information", keywords: "telehealth virtual care healthtech", systems: ["Digital care, telehealth and mobile application platforms", "Identity, consent and health-data exchange services"] },
  { slug: "pharmaceuticals", name: "Pharmaceuticals", category: "health-life-sciences", focus: "pharmaceutical research, quality and product information", keywords: "pharma drug medicines", systems: ["Quality management and regulatory information systems", "Research, laboratory and supply-chain platforms"] },
  { slug: "biotechnology", name: "Biotechnology", category: "health-life-sciences", focus: "biotechnology research, laboratory workflows and intellectual property", keywords: "biotech bioengineering", systems: ["Laboratory information and research data platforms", "Quality, sample and controlled-document systems"] },
  { slug: "life-sciences", name: "Life sciences", category: "health-life-sciences", focus: "life-sciences research, study information and evidence management", keywords: "research clinical trials genomics", systems: ["Research, study and laboratory data platforms", "Consent, publication and research-compliance tools"] },
  { slug: "medical-devices", name: "Medical devices", category: "health-life-sciences", focus: "medical-device design, quality, service and product lifecycle records", keywords: "medtech diagnostics equipment", systems: ["Product lifecycle and quality management systems", "Device service, regulatory and complaint-management tools"] },
  { slug: "banking", name: "Banking", category: "financial-services", focus: "banking services, account operations and customer information", keywords: "bank retail commercial", systems: ["Core banking, CRM and case-management platforms", "Payment, identity verification and fraud-monitoring systems"] },
  { slug: "finance", name: "Finance", category: "financial-services", focus: "financial operations, reporting and controlled business information", keywords: "financial corporate accounting", systems: ["Finance, ERP and reporting platforms", "Identity, records and audit-management systems"] },
  { slug: "fintech", name: "Fintech", category: "financial-services", focus: "financial technology products, digital services and transaction workflows", keywords: "financial technology lending", systems: ["Digital banking, payment and API platforms", "Cloud-native identity, fraud and monitoring services"] },
  { slug: "insurance", name: "Insurance", category: "financial-services", focus: "policy servicing, claims administration and insurance information", keywords: "insurer underwriting claims", systems: ["Policy administration and claims platforms", "CRM, document management and actuarial data tools"] },
  { slug: "payments", name: "Payments", category: "financial-services", focus: "payment operations, reconciliation and transaction support", keywords: "payment processing merchant cards", systems: ["Payment gateways, ledgers and reconciliation platforms", "Fraud, identity, dispute and compliance systems"] },
  { slug: "manufacturing", name: "Manufacturing", category: "industrial-infrastructure", focus: "production, maintenance, quality and industrial operations", keywords: "factory industrial production", systems: ["Manufacturing execution, ERP and maintenance platforms", "Quality, inventory and industrial data systems"] },
  { slug: "robotics", name: "Robotics", category: "industrial-infrastructure", focus: "robotics engineering, fleet information and service operations", keywords: "robot automation cobots autonomous machines", systems: ["Robot fleet and engineering lifecycle platforms", "Operational technology monitoring and service records"] },
  { slug: "energy", name: "Energy", category: "industrial-infrastructure", focus: "energy asset, market and operational information", keywords: "power generation electricity", systems: ["Asset, maintenance and energy-management systems", "Operational data platforms and enterprise planning tools"] },
  { slug: "oil-gas", name: "Oil & gas", category: "industrial-infrastructure", focus: "oil and gas asset integrity, field services and operational records", keywords: "petroleum upstream downstream drilling", systems: ["Asset integrity, maintenance and field-service systems", "Operational technology historians and supply platforms"] },
  { slug: "renewables", name: "Renewable energy", category: "industrial-infrastructure", focus: "renewable generation, project and asset-performance information", keywords: "solar wind clean energy", systems: ["Renewable asset and generation monitoring platforms", "Project, maintenance and weather-data services"] },
  { slug: "utilities", name: "Utilities", category: "industrial-infrastructure", focus: "utility service, asset and customer operations", keywords: "water electricity gas infrastructure", systems: ["Utility asset, outage and customer-information systems", "Metering, work management and field-service platforms"] },
  { slug: "government", name: "Government", category: "public-sector", focus: "agency information, accountable administration and public programs", keywords: "government agency ministry federal", systems: ["Agency records, identity and case-management platforms", "Public-sector cloud and procurement-approved services"] },
  { slug: "public-services", name: "Public services", category: "public-sector", focus: "resident-facing services, requests and public information", keywords: "municipal citizen community service", systems: ["Digital service portals and case-management systems", "Records, contact-center and public-information platforms"] },
  { slug: "smart-cities", name: "Smart cities", category: "public-sector", focus: "city services, urban data and cross-agency coordination", keywords: "urban planning municipality connected city", systems: ["Geospatial, transport and municipal-data platforms", "IoT, facilities and civic-service systems"] },
  { slug: "transportation", name: "Transportation", category: "transport-logistics", focus: "transport operations, service status and passenger coordination", keywords: "transit mobility rail public transport", systems: ["Fleet, scheduling and transport-management platforms", "Passenger information, ticketing and maintenance systems"] },
  { slug: "aviation", name: "Aviation", category: "transport-logistics", focus: "aviation operations, service coordination and controlled records", keywords: "airport airline flight aerospace", systems: ["Airport, airline and ground-operations platforms", "Maintenance, scheduling and controlled document systems"] },
  { slug: "logistics", name: "Logistics", category: "transport-logistics", focus: "logistics coordination, shipment status and exception handling", keywords: "freight warehouse delivery", systems: ["Transport and warehouse management platforms", "Carrier, order and customer-service integrations"] },
  { slug: "supply-chains", name: "Supply chains", category: "transport-logistics", focus: "supplier, inventory, procurement and supply-chain visibility", keywords: "procurement sourcing supplier inventory", systems: ["ERP, procurement and inventory platforms", "Supplier portals, EDI and traceability systems"] },
  { slug: "retail", name: "Retail", category: "consumer-services", focus: "store operations, product information and customer service", keywords: "shops point of sale merchandising", systems: ["Point-of-sale, inventory and product information systems", "Commerce, CRM and customer-support platforms"] },
  { slug: "e-commerce", name: "E-commerce", category: "consumer-services", focus: "digital storefronts, online orders and customer journeys", keywords: "online shopping digital commerce ecommerce", systems: ["Commerce, product catalogue and order management", "Payment, fulfilment and customer-engagement services"] },
  { slug: "hospitality", name: "Hospitality", category: "consumer-services", focus: "guest services, property operations and booking information", keywords: "hotels restaurants guest service", systems: ["Property, reservation and point-of-sale systems", "Guest-service, workforce and channel-management platforms"] },
  { slug: "tourism", name: "Tourism", category: "consumer-services", focus: "travel information, visitor services and tourism operations", keywords: "travel destinations visitor leisure", systems: ["Booking, destination and visitor-information platforms", "Customer-service, partner and itinerary systems"] },
  { slug: "media", name: "Media", category: "digital-professional", focus: "media production, editorial knowledge and rights-aware content operations", keywords: "publishing broadcast journalism news", systems: ["Content management and digital-asset platforms", "Editorial, rights-management and distribution tools"] },
  { slug: "entertainment", name: "Entertainment", category: "digital-professional", focus: "entertainment production, licensed assets and audience operations", keywords: "film music gaming events", systems: ["Production, event and digital-asset platforms", "Rights, ticketing and audience-management systems"] },
  { slug: "marketing", name: "Marketing", category: "digital-professional", focus: "marketing operations, campaign information and consent-aware audiences", keywords: "advertising brand campaign", systems: ["Marketing automation, CRM and consent platforms", "Content, analytics and campaign-management tools"] },
  { slug: "telecommunications", name: "Telecommunications", category: "industrial-infrastructure", focus: "telecom service operations, network information and customer support", keywords: "telecom network internet connectivity", systems: ["Network inventory, assurance and service platforms", "Billing, customer-service and operations systems"] },
  { slug: "cybersecurity", name: "Cybersecurity", category: "digital-professional", focus: "security operations, vulnerability information and incident coordination", keywords: "infosec cyber security soc risk", systems: ["SIEM, endpoint and vulnerability-management platforms", "Identity, ticketing and incident-response tools"] },
  { slug: "real-estate", name: "Real estate", category: "built-environment", focus: "property portfolios, transactions and facilities information", keywords: "property buildings leasing asset", systems: ["Property, leasing and facilities-management platforms", "CRM, finance and document-management systems"] },
  { slug: "construction", name: "Construction", category: "built-environment", focus: "construction project delivery, site documentation and hand-offs", keywords: "contractor building civil engineering", systems: ["BIM, project-management and document-control platforms", "Procurement, site and safety-management systems"] },
  { slug: "education", name: "Education", category: "research-community", focus: "learning administration, educator support and approved student services", keywords: "schools universities learning students", systems: ["Learning management and student information systems", "Identity, accessibility and collaboration platforms"] },
  { slug: "legal-services", name: "Legal services", category: "digital-professional", focus: "legal matter administration, document search and client-service workflows", keywords: "law firms attorneys legal practice", systems: ["Matter, document and practice-management platforms", "Secure client collaboration and time-recording tools"] },
  { slug: "accounting", name: "Accounting", category: "digital-professional", focus: "accounting workflows, financial records and reviewable reporting", keywords: "bookkeeping audit tax finance", systems: ["Accounting, ERP and document-management platforms", "Secure client portals and reporting tools"] },
  { slug: "hr", name: "Human resources", category: "digital-professional", focus: "employee services, HR administration and workforce information", keywords: "human resources people payroll talent", systems: ["HRIS, payroll and workforce-management platforms", "Identity, learning and employee-service tools"] },
  { slug: "recruitment", name: "Recruitment", category: "digital-professional", focus: "recruitment coordination, candidate communication and hiring administration", keywords: "staffing hiring talent acquisition", systems: ["Applicant tracking and recruiting CRM systems", "Scheduling, assessment and HR platforms"] },
  { slug: "agriculture", name: "Agriculture", category: "food-natural-resources", focus: "farm operations, crop information and agricultural coordination", keywords: "farming crops livestock agritech", systems: ["Farm management, field and equipment platforms", "Weather, geospatial and supply-chain information"] },
  { slug: "food-technology", name: "Food technology", category: "food-natural-resources", focus: "food product development, quality information and production records", keywords: "foodtech food science processing nutrition", systems: ["Food production, quality and laboratory systems", "Product, supplier and traceability platforms"] },
  { slug: "automotive", name: "Automotive", category: "industrial-infrastructure", focus: "automotive product, service and supply operations", keywords: "vehicles dealership mobility auto", systems: ["Dealer, service and parts platforms", "Manufacturing, quality and connected-product systems"] },
  { slug: "aerospace", name: "Aerospace", category: "industrial-infrastructure", focus: "aerospace engineering records, supply and product lifecycle information", keywords: "aviation aircraft space defense", systems: ["Engineering lifecycle and configuration-management platforms", "Quality, maintenance and controlled supplier systems"] },
  { slug: "mining", name: "Mining", category: "industrial-infrastructure", focus: "mining operations, remote assets and maintenance information", keywords: "minerals metals extraction resources", systems: ["Mine planning, asset and maintenance platforms", "Remote-site, fleet and operational data systems"] },
  { slug: "scientific-research", name: "Scientific research", category: "research-community", focus: "research data, publication workflows and scientific collaboration", keywords: "science laboratories academia research institute", systems: ["Research data, laboratory and compute platforms", "Identity, publication and collaboration services"] },
  { slug: "sports", name: "Sports", category: "research-community", focus: "sports administration, event coordination and approved performance information", keywords: "teams clubs leagues events", systems: ["Competition, membership and event-management tools", "Training, scheduling and media platforms"] },
  { slug: "fitness", name: "Fitness", category: "research-community", focus: "fitness services, membership operations and consent-aware activity information", keywords: "gyms wellness exercise health clubs", systems: ["Membership, booking and coaching platforms", "Wearable, payment and customer-service systems"] },
  { slug: "nonprofits", name: "Non-profits", category: "research-community", focus: "non-profit programs, donor administration and mission-led service delivery", keywords: "charities charity nonprofit foundations", systems: ["Donor, volunteer and program-management systems", "Finance, communication and case-management platforms"] },
  { slug: "ngos", name: "NGOs", category: "research-community", focus: "NGO programs, partner coordination and accountable field operations", keywords: "non-governmental international development aid", systems: ["Program, grant and partner-management platforms", "Secure field, finance and reporting systems"] },
  { slug: "environmental-services", name: "Environmental services", category: "food-natural-resources", focus: "environmental monitoring, field observations and compliance records", keywords: "climate sustainability conservation water", systems: ["Environmental, geospatial and sensor-data platforms", "Field service, reporting and records-management systems"] },
  { slug: "professional-services", name: "Professional services", category: "digital-professional", focus: "professional delivery, knowledge sharing and client-service administration", keywords: "consulting advisory agencies service firms", systems: ["Project, CRM and resource-management platforms", "Secure knowledge, document and collaboration tools"] },
];

function makeIndustry(definition: IndustryDefinition): Industry {
  const profile = profiles[definition.category];
  const systems = definition.systems ?? profile.systems;
  const keywords = definition.keywords.split(" ");
  const challenges = [
    `Keeping ${definition.focus} accurate and findable across teams, systems and responsible owners.`,
    ...profile.challenges.slice(0, 2),
  ];
  const opportunities = profile.opportunities.map((opportunity) => `${opportunity} For ${definition.name.toLowerCase()}, focus on ${definition.focus}.`);
  const agents = profile.agents.map((agent) => `${agent} In ${definition.name.toLowerCase()}, scope it around ${definition.focus}.`);
  const integrations = [
    ...systems,
    "Single sign-on, role-based access and approved identity providers",
    "Documented APIs or controlled file exchange, with monitoring and error handling",
  ];
  const summary = `Explore practical technology for ${definition.focus}, shaped around ${definition.name.toLowerCase()} workflows and controls.`;

  return {
    ...definition,
    icon: profile.icon,
    keywords,
    systems,
    summary,
    introduction: `${definition.name} organizations work with ${definition.focus}. Technology choices should fit existing operating models, information quality, approved systems and the people accountable for the work. Any regulated, safety-critical or professional activity needs review by the relevant qualified specialists.`,
    challenges,
    opportunities,
    agents,
    services: profile.services,
    integrations,
    safeguards: profile.safeguards,
    example: `Illustrative example only: an organization in ${definition.name.toLowerCase()} could assess a source-linked information assistant for ${definition.focus}, restricted to approved material and reviewed by an accountable person. This is a general capability example, not a delivered project or promised outcome.`,
  };
}

export const industries: Industry[] = definitions.map(makeIndustry);

export function getIndustryPath(slug: string): string {
  return `/industries/${slug}/`;
}

export function getIndustryCategoryName(slug: string): string {
  return industryCategories.find((category) => category.slug === slug)?.name ?? "Industry";
}
