declare module "disconnect" {
  export const Discogs: any;
}

export type DiscogsApiRelease = {
  id: number;
  title: string;
  artists?: DiscogsArtist[];
  data_quality: string;
  thumb: string;
  community: {
    contributors: { resource_url: string; username: string }[];
    data_quality: string;
    have: number;
    rating: {
      average: number;
      count: number;
    };
    status: string;
    submitter: { resource_url: string; username: string };
    want: number;
  };
  companies: DiscogsCompany[];
  country: string;
  date_added: string; // ISO datetime
  date_changed: string; // ISO datetime
  estimated_weight: number;
  extraartists?: DiscogsArtist[];
  format_quantity: number;
  formats: {
    descriptions: string[];
    name: string;
    qty: string;
  }[];
  genres: string[];
  identifiers: {
    type: string;
    value: string;
  }[];
  images: {
    height: number;
    resource_url: string;
    type: "primary" | "secondary" | string;
    uri: string;
    uri150: string;
    width: number;
  }[];
  labels: {
    catno: string;
    entity_type: string;
    id: number;
    name: string;
    resource_url: string;
  }[];
  lowest_price: number;
  master_id: number;
  master_url: string;
  notes: string;
  num_for_sale: number;
  released: string;
  released_formatted: string;
  resource_url: string;
  series: any[]; // not enough info in sample
  status: string;
  styles: string[];
  tracklist: {
    duration: string;
    position: string;
    title: string;
    type_: string;
  }[];
  uri: string;
  videos: DiscogsVideo[];
  year: number;
};

/* ---- Subtypes ---- */

export type DiscogsVideo = {
  description: string;
  duration: number;
  embed: boolean;
  title: string;
  uri: string;
};

export type DiscogsArtist = {
  anv?: string;
  id: number;
  join: string;
  name: string;
  resource_url: string;
  role: string;
  tracks: string;
};

export type DiscogsCompany = {
  catno: string;
  entity_type: string;
  entity_type_name: string;
  id: number;
  name: string;
  resource_url: string;
};

export type Pagination = {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: {
    last: string;
    next: string;
  };
};

type DiscogsApiAnswer<T> = { pagination: Pagination } & T;
