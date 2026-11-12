export const STARTER_DLT_OFFICES = [
  {
    slug: "dlt-bangkok",
    nameEn: "Bangkok land transport office",
    nameTh: "สำนักงานขนส่งกรุงเทพมหานคร",
    province: "Bangkok",
    supportedServiceKinds: ["NEW_CAR", "NEW_MOTORCYCLE", "NEW_BOTH", "CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH", "RENEWAL", "LOST_REPLACEMENT", "IDP"],
  },
  {
    slug: "dlt-chiang-mai",
    nameEn: "Chiang Mai Provincial Land Transport Office",
    nameTh: "สำนักงานขนส่งจังหวัดเชียงใหม่",
    province: "Chiang Mai",
    supportedServiceKinds: ["NEW_CAR", "NEW_MOTORCYCLE", "NEW_BOTH", "CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH", "RENEWAL", "LOST_REPLACEMENT"],
  },
  {
    slug: "dlt-chon-buri",
    nameEn: "Chon Buri Provincial Land Transport Office",
    nameTh: "สำนักงานขนส่งจังหวัดชลบุรี",
    province: "Chon Buri",
    supportedServiceKinds: ["NEW_CAR", "NEW_MOTORCYCLE", "NEW_BOTH", "CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH", "RENEWAL"],
  },
  {
    slug: "dlt-phuket",
    nameEn: "Phuket Provincial Land Transport Office",
    nameTh: "สำนักงานขนส่งจังหวัดภูเก็ต",
    province: "Phuket",
    supportedServiceKinds: ["NEW_CAR", "NEW_MOTORCYCLE", "RENEWAL"],
  },
] as const;

export const OFFICE_ADDRESS_NOTE =
  "Branch address and telephone are not confirmed in this record. Check the office shown in DLT Smart Queue before the visit.";
