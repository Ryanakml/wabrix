declare module "turndown" {
  export default class TurndownService {
    constructor(options?: {
      headingStyle?: string;
      codeBlockStyle?: string;
    });

    turndown(input: string): string;
  }
}
