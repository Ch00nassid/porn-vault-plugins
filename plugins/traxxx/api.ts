import { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { Context } from "../../types/plugin";

export namespace EntityResult {
  export interface Entity {
    id: number;
    name: string;
    url: string;
    description: string | null;
    slug: string;
    type: string;
    independent: boolean;
    aliases: string[] | null;
    logo: string;
    thumbnail: string;
    favicon: string;
    parent: Entity | null;
    children: Entity[] | null;
    tags: string[] | null;
  }

  export interface Result {
    // Entity always exists for successful http requests
    // ex: null when 404
    entity: Entity;
  }
}

export class Api {
  ctx: Context;
  axios: AxiosInstance;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.axios = ctx.$axios.create({
      baseURL: "https://traxxx.me/api",
    });
  }

  /**
   * @param idOrSlug - the id or slug of the channel
   */
  public async getChannel(idOrSlug: string | number): Promise<AxiosResponse<EntityResult.Result>> {
    return this.axios.get<EntityResult.Result>(`/channels/${idOrSlug}`);
  }

  /**
   * @param idOrSlug - the id or slug of the network
   */
  public async getNetwork(idOrSlug: string | number): Promise<AxiosResponse<EntityResult.Result>> {
    return this.axios.get<EntityResult.Result>(`/networks/${idOrSlug}`);
  }

  /**
   * Gets the channel and/or network for the slug
   *
   * @param idOrSlug - the id or slug of the channel/network
   */
  public async getAllEntities(
    idOrSlug: string | number
  ): Promise<{
    channel: EntityResult.Entity | undefined;
    network: EntityResult.Entity | undefined;
  }> {
    const searchPromises: Promise<EntityResult.Entity | undefined>[] = [];

    // We still need to search for both channels & networks, even if
    // we know the type, so that we can tell if there would be name conflicts
    searchPromises.push(
      this.getChannel(idOrSlug)
        .then((res) => res.data.entity)
        .catch((err) => {
          const _err = err as AxiosError;
          if (_err.response?.status === 404) {
            this.ctx.$logger.verbose(`"${idOrSlug}" does not exist as a channel`);
          } else {
            this.ctx.$throw(err);
          }
          return undefined;
        })
    );
    searchPromises.push(
      this.getNetwork(idOrSlug)
        .then((res) => res.data.entity)
        .catch((err) => {
          const _err = err as AxiosError;
          if (_err.response?.status === 404) {
            this.ctx.$logger.verbose(`"${idOrSlug}" does not exist as a network`);
          } else {
            this.ctx.$throw(err);
          }
          return undefined;
        })
    );

    const [channel, network] = await Promise.all(searchPromises);

    return {
      channel,
      network,
    };
  }
}

export const buildImageUrls = (
  entity: EntityResult.Entity
): {
  logo: string | undefined;
  thumbnail: string | undefined;
  favicon: string | undefined;
} => {
  const baseUrl = "https://traxxx.me/img/logos/";

  return {
    logo: entity.logo ? `${baseUrl}${entity.logo}` : undefined,
    thumbnail: entity.thumbnail ? `${baseUrl}${entity.thumbnail}` : undefined,
    favicon: entity.favicon ? `${baseUrl}${entity.favicon}` : undefined,
  };
};
