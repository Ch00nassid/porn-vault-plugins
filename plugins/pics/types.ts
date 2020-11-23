import * as zod from "zod";

import { DeepPartial } from "../../types/plugin";
import { SceneContext } from "../../types/scene";
import { StudioContext } from "../../types/studio";
import { ActorContext } from "./../../types/actor";
import { MovieContext } from "./../../types/movie";

const baseScrapeDefinition = zod.object({
  path: zod.string().refine((val) => val && val.trim().length, "The path cannot be empty"),
  searchTerm: zod.string().optional(),
  blacklistTerms: zod.array(zod.string()).optional(),
  getAllExtra: zod.boolean().optional(),
});

const ActorConf = baseScrapeDefinition
  .extend({
    prop: zod.enum(["thumbnail", "altThumbnail", "avatar", "hero", "extra"]),
  })
  .refine(
    ({ prop, searchTerm }) => {
      if (prop !== "extra" && !searchTerm) {
        return false;
      }
      return true;
    },
    {
      message: '"searchTerm" is required for non "extra" images',
    }
  );

const SceneConf = baseScrapeDefinition
  .extend({
    prop: zod.enum(["thumbnail", "extra"]),
  })
  .refine(
    ({ prop, searchTerm }) => {
      if (prop !== "extra" && !searchTerm) {
        return false;
      }
      return true;
    },
    {
      message: '"searchTerm" is required for non "extra" images',
    }
  );

const MovieConf = baseScrapeDefinition
  .extend({
    prop: zod.enum(["backCover", "frontCover", "spineCover", "extra"]),
  })
  .refine(
    ({ prop, searchTerm }) => {
      if (prop !== "extra" && !searchTerm) {
        return false;
      }
      return true;
    },
    {
      message: '"searchTerm" is required for non "extra" images',
    }
  );

const StudioConf = baseScrapeDefinition
  .extend({
    prop: zod.enum(["thumbnail", "extra"]),
  })
  .refine(
    ({ prop, searchTerm }) => {
      if (prop !== "extra" && !searchTerm) {
        return false;
      }
      return true;
    },
    {
      message: '"searchTerm" is required for non "extra" images',
    }
  );

export const ArgsSchema = zod.object({
  dry: zod.boolean().optional(),
  actors: zod.array(ActorConf).optional(),
  scenes: zod.array(SceneConf).optional(),
  movies: zod.array(MovieConf).optional(),
  studios: zod.array(StudioConf).optional(),
});

export type ScrapeDefinition =
  | zod.infer<typeof ActorConf>
  | zod.infer<typeof SceneConf>
  | zod.infer<typeof MovieConf>
  | zod.infer<typeof StudioConf>;

export type ArgsSchemaType = zod.infer<typeof ArgsSchema>;

export type MyContext = (ActorContext | SceneContext | MovieContext | StudioContext) & {
  args: DeepPartial<ArgsSchemaType>;
};
