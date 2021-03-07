import { SceneContext } from "../../types/scene";

export interface MySceneContext extends SceneContext {
  args: {
    dry?: boolean;
    parseDate?: boolean;
  };
}

export type IFileParserConfigElem = {
  scopeDirname?: boolean;
  regex: string;
  matchesToUse?: number[];
  groupsToUse?: number[];
  splitter?: string;
};

export type IFileParserConfig = {
  studioMatcher?: IFileParserConfigElem;
  nameMatcher?: IFileParserConfigElem;
  actorsMatcher?: IFileParserConfigElem;
  movieMatcher?: IFileParserConfigElem;
  labelsMatcher?: IFileParserConfigElem;
};
