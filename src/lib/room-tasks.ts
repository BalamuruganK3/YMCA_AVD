import { AreaSlug } from "./constants";

export interface TaskDefinition {
  group_name: string;
  subgroup: string | null;
  title: string;
  kind: "work" | "material";
  sort_order: number;
}

export function getRoomDefaultWorkItems(area: AreaSlug, roomName: string): TaskDefinition[] {
  const normName = roomName.toLowerCase().trim();

  // 1. Control Room
  if (area === "control_room" || normName.includes("control")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Civil Work",
        subgroup: "Top Finish",
        title: "False Flooring",
        kind: "work",
        sort_order: 5,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Work Station Table",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Revolving Chair",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Storage Rack",
        kind: "material",
        sort_order: 8,
      },

      // 2. Electrical work
      {
        group_name: "Electrical Work",
        subgroup: "Electrical",
        title: "Raw Material",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Electrical",
        title: "PVC conduit",
        kind: "work",
        sort_order: 10,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Electrical",
        title: "Light points",
        kind: "work",
        sort_order: 11,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Electrical",
        title: "Power sockets",
        kind: "work",
        sort_order: 12,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Electrical",
        title: "AC point",
        kind: "work",
        sort_order: 13,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Lighting",
        title: "Light Fixes",
        kind: "work",
        sort_order: 14,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Lighting",
        title: "Cove light",
        kind: "material",
        sort_order: 15,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Lighting",
        title: "Source light",
        kind: "material",
        sort_order: 16,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Lighting",
        title: "Profile light",
        kind: "material",
        sort_order: 17,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Equipment",
        title: "AC",
        kind: "material",
        sort_order: 18,
      },
      {
        group_name: "Electrical Work",
        subgroup: "Equipment",
        title: "White fan",
        kind: "material",
        sort_order: 19,
      },

      // 3. Server work
      {
        group_name: "Server Work",
        subgroup: "Server & Network",
        title: "Main School server",
        kind: "material",
        sort_order: 20,
      },
      {
        group_name: "Server Work",
        subgroup: "Server & Network",
        title: "Server router",
        kind: "material",
        sort_order: 21,
      },
      {
        group_name: "Server Work",
        subgroup: "Server & Network",
        title: "Server rack",
        kind: "material",
        sort_order: 22,
      },
      {
        group_name: "Server Work",
        subgroup: "Hardware",
        title: "Monitor and PC",
        kind: "material",
        sort_order: 23,
      },
      {
        group_name: "Server Work",
        subgroup: "Equipment",
        title: "Inverter AC",
        kind: "material",
        sort_order: 24,
      },
      {
        group_name: "Server Work",
        subgroup: "Server & Network",
        title: "Layer 2 switch",
        kind: "material",
        sort_order: 25,
      },
    ];
  }

  // 2. CS Lab
  if (normName === "cs lab" || normName.includes("computer") || normName.includes("cs")) {
    return [
      // 1. Material
      {
        group_name: "Material",
        subgroup: "Systems",
        title: "Computer system for students",
        kind: "material",
        sort_order: 1,
      },
      {
        group_name: "Material",
        subgroup: "Systems",
        title: "Computer system for teacher",
        kind: "material",
        sort_order: 2,
      },
      {
        group_name: "Material",
        subgroup: "Networking",
        title: "24 Port managed switch",
        kind: "material",
        sort_order: 3,
      },
      {
        group_name: "Material",
        subgroup: "Networking",
        title: "WIFI 6 AP",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Material",
        subgroup: "Networking",
        title: "Cat6A Network data Point",
        kind: "work",
        sort_order: 5,
      },
      {
        group_name: "Material",
        subgroup: "Networking",
        title: "24 port Cat6 Patch Panel",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Material",
        subgroup: "Networking",
        title: "12U Server Rack",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Material",
        subgroup: "Storage",
        title: "NAS Storage 2 TB",
        kind: "material",
        sort_order: 8,
      },

      // 2. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 9,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion with art work",
        kind: "work",
        sort_order: 10,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 11,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 12,
      },
      {
        group_name: "Civil Work",
        subgroup: "Acrylic Wording",
        title: "Emposed Acrylic wording in Tamil",
        kind: "work",
        sort_order: 13,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Computer table",
        kind: "material",
        sort_order: 14,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Students chair",
        kind: "material",
        sort_order: 15,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher table",
        kind: "material",
        sort_order: 16,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher chair",
        kind: "material",
        sort_order: 17,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Side table",
        kind: "material",
        sort_order: 18,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Storage table with lock & key for interactive board",
        kind: "material",
        sort_order: 19,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Storage table with lock & key",
        kind: "material",
        sort_order: 20,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wall storage with lock and key",
        kind: "material",
        sort_order: 21,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel metal door",
        kind: "material",
        sort_order: 22,
      },
    ];
  }

  // 3. Phy Lab
  if (normName === "phy lab" || normName.includes("physics") || normName.includes("phy")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion with art work",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Civil Work",
        subgroup: "Acrylic Wording",
        title: "Emposed Acrylic wording in Tamil",
        kind: "work",
        sort_order: 5,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Workstation table & power sockets",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Workstation table floor mat",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher table",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher chair",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Side table",
        kind: "material",
        sort_order: 10,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Storage table with lock & key",
        kind: "material",
        sort_order: 11,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wall storage with lock & key partially glazed",
        kind: "material",
        sort_order: 12,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel Metal door",
        kind: "material",
        sort_order: 13,
      },
    ];
  }

  // 4. Chem Lab
  if (normName === "chem lab" || normName.includes("chemistry") || normName.includes("chem")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion with art work",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Civil Work",
        subgroup: "Acrylic Wording",
        title: "Emposed Acrylic wording in Tamil",
        kind: "work",
        sort_order: 5,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Workstation table With Sink & Power Sockets",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher table",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher chair",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Side table",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Storage table with lock & key Below of Interactive Board",
        kind: "material",
        sort_order: 10,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Storage table with lock & key",
        kind: "material",
        sort_order: 11,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wall storage with lock & key partially glazed",
        kind: "material",
        sort_order: 12,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel Metal door",
        kind: "material",
        sort_order: 13,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Gas pipeline",
        kind: "work",
        sort_order: 14,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Gas Pipeline Connectors",
        kind: "material",
        sort_order: 15,
      },
    ];
  }

  // 5. Bio Lab
  if (normName === "bio lab" || normName.includes("biology") || normName.includes("bio")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion with art work",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Civil Work",
        subgroup: "Acrylic Wording",
        title: "Emposed Acrylic wording in Tamil",
        kind: "work",
        sort_order: 5,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Workstation table & power sockets with sink",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Workstation table floor mat",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher table",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher chair",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Side table",
        kind: "material",
        sort_order: 10,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Storage table with lock & key Below of Interactive Board",
        kind: "material",
        sort_order: 11,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wall storage with lock & key partially glazed",
        kind: "material",
        sort_order: 12,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel Metal door",
        kind: "material",
        sort_order: 13,
      },
    ];
  }

  // 6. Stem Lab
  if (normName === "stem lab" || normName.includes("stem")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion with art work",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Civil Work",
        subgroup: "Acrylic Wording",
        title: "Emposed Acrylic wording in Tamil",
        kind: "work",
        sort_order: 5,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Workstation table",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Students chair",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rubber mat for table",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher table",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Side table",
        kind: "material",
        sort_order: 10,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wall storage with lock & key partially glazed",
        kind: "material",
        sort_order: 11,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel Metal door",
        kind: "material",
        sort_order: 12,
      },
    ];
  }

  // 7. Library Room
  if (area === "library" || normName.includes("library")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion with art work",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Civil Work",
        subgroup: "Acrylic Wording",
        title: "Emposed Acrylic wording in Tamil",
        kind: "work",
        sort_order: 5,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Optimize study table",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Students chair",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher table",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teacher chair",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Side table",
        kind: "material",
        sort_order: 10,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wise book case",
        kind: "material",
        sort_order: 11,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel metal door",
        kind: "material",
        sort_order: 12,
      },

      // System
      {
        group_name: "System",
        subgroup: null,
        title: "Computer system",
        kind: "material",
        sort_order: 13,
      },
      {
        group_name: "System",
        subgroup: null,
        title: "Barcode reader",
        kind: "material",
        sort_order: 14,
      },
    ];
  }

  // 8. Staff Room
  if (area === "staff_room" || normName.includes("staff")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra Blind",
        kind: "material",
        sort_order: 4,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teachers table with popup box",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Teachers chair",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Locker box",
        kind: "material",
        sort_order: 7,
      },
    ];
  }

  // 9. Entrance Corridor
  if (
    area === "entrance_corridor" ||
    normName.includes("entrance") ||
    normName.includes("corridor")
  ) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Plain false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Acrylic Wording",
        title: "Emposed acrylic wording",
        kind: "work",
        sort_order: 4,
      },

      // Reception Area
      {
        group_name: "Reception Area",
        subgroup: null,
        title: "Computer system for reception",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Reception Area",
        subgroup: null,
        title: "Reception table",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Reception Area",
        subgroup: null,
        title: "Reception back wall panel",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Reception Area",
        subgroup: null,
        title: "Chair",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Reception Area",
        subgroup: null,
        title: "Loose furniture",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Reception Area",
        subgroup: null,
        title: "Artifact",
        kind: "material",
        sort_order: 10,
      },
    ];
  }

  // 10. Principal Room
  if (area === "principal_room" || normName.includes("principal")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Multi level false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium acrylic emulsion",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain premium acrylic emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra blind",
        kind: "material",
        sort_order: 4,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Backwall panaling",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Open book rack",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Credenza",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel metal door",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Principal table",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Principal executive chair",
        kind: "material",
        sort_order: 10,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Visitor sofa",
        kind: "material",
        sort_order: 11,
      },
    ];
  }

  // 11. Admin Room
  if (area === "admin_room" || normName.includes("admin")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Multi level false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium acrylic emulsion",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain premium acrylic emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra blind",
        kind: "material",
        sort_order: 4,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Backwall panaling",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Open book rack",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Credenza",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Reception table",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rolling chair",
        kind: "material",
        sort_order: 9,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Visitor chair",
        kind: "material",
        sort_order: 10,
      },
    ];
  }

  // 12. Record Store Room
  if (area === "record_store_room" || normName.includes("record")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Multi level false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium acrylic emulsion",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain premium acrylic emulsion",
        kind: "work",
        sort_order: 3,
      },
      {
        group_name: "Civil Work",
        subgroup: "Blackout Blinds",
        title: "Zebra blind",
        kind: "material",
        sort_order: 4,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Waller book case",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wise book case",
        kind: "material",
        sort_order: 6,
      },
    ];
  }

  // 13. Medical Room
  if (area === "medical_room" || normName.includes("medical")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "False Ceiling",
        title: "Multi level false ceiling",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Civil Work",
        subgroup: "Wall Painting",
        title: "Premium acrylic emulsion",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Civil Work",
        subgroup: "Ceiling Painting",
        title: "Plain premium acrylic emulsion",
        kind: "work",
        sort_order: 3,
      },

      // Carpentry Work & Equipment
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Lean to wall running table",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Visitor chair",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Refrigerator",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Patient bed set",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel metal door",
        kind: "material",
        sort_order: 8,
      },
    ];
  }

  // 14. PET Room / Per Room
  if (area === "pet_room" || normName.includes("pet") || normName.includes("per")) {
    return [
      // 1. Civil work
      {
        group_name: "Civil Work",
        subgroup: "Painting",
        title: "Premium Acrylic Emulsion",
        kind: "work",
        sort_order: 1,
      },

      // Masonry
      {
        group_name: "Masonry",
        subgroup: null,
        title: "Flush door with frame",
        kind: "work",
        sort_order: 2,
      },
      {
        group_name: "Masonry",
        subgroup: null,
        title: "Slotted angle storage",
        kind: "material",
        sort_order: 3,
      },

      // Carpentry Work
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Executive table",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rolling chair",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Visitor chair",
        kind: "material",
        sort_order: 6,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Wall mounted fan",
        kind: "material",
        sort_order: 7,
      },
      {
        group_name: "Carpentry Work",
        subgroup: null,
        title: "Rafel metal door",
        kind: "material",
        sort_order: 8,
      },
    ];
  }

  // 15. Play Area
  if (area === "play_area" || normName.includes("play")) {
    return [
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Flooring",
        title: "EPDM rubber safety flooring",
        kind: "work",
        sort_order: 1,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Play Station",
        title: "Multi play station with slide, tunnel, climbing wall",
        kind: "material",
        sort_order: 2,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Play Equipment",
        title: "Merry go round",
        kind: "material",
        sort_order: 3,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Play Equipment",
        title: "Seesaw",
        kind: "material",
        sort_order: 4,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Play Equipment",
        title: "Balance play equipment",
        kind: "material",
        sort_order: 5,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Artwork",
        title: "Wall graphics and educational artwork",
        kind: "work",
        sort_order: 6,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Lighting",
        title: "Decorative LED lighting",
        kind: "work",
        sort_order: 7,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Landscaping",
        title: "Indoor landscaping with planters",
        kind: "material",
        sort_order: 8,
      },
      {
        group_name: "Play Area & Infrastructure",
        subgroup: "Electrical",
        title: "Electrical works",
        kind: "work",
        sort_order: 9,
      },
    ];
  }

  // Classrooms 1–9, then 10 A/B, 11 A/B, 12 A/B
  return [
    {
      group_name: "Civil Work",
      subgroup: "False Ceiling",
      title: "Plain False Ceiling",
      kind: "work",
      sort_order: 1,
    },
    {
      group_name: "Civil Work",
      subgroup: "Painting",
      title: "Wall Painting",
      kind: "work",
      sort_order: 2,
    },
    {
      group_name: "Civil Work",
      subgroup: "Flooring",
      title: "Floor Tiles",
      kind: "work",
      sort_order: 3,
    },
    {
      group_name: "Electrical Work",
      subgroup: "Wiring",
      title: "Power Wiring",
      kind: "work",
      sort_order: 4,
    },
    {
      group_name: "Electrical Work",
      subgroup: "Lighting",
      title: "LED Panel Lights",
      kind: "work",
      sort_order: 5,
    },
    { group_name: "Furniture", subgroup: null, title: "Tables", kind: "material", sort_order: 6 },
    { group_name: "Furniture", subgroup: null, title: "Chairs", kind: "material", sort_order: 7 },
    {
      group_name: "Equipment",
      subgroup: null,
      title: "Interactive Panel",
      kind: "material",
      sort_order: 8,
    },
  ];
}
