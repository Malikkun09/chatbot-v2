export function createThinkingSplitter() {
  let pending = "";
  let inThink = false;

  const partialOpen = (value: string): number => {
    const lt = value.lastIndexOf("<");
    if (lt === -1) return -1;
    const slice = value.slice(lt);
    if ("<think>".startsWith(slice)) return lt;
    return -1;
  };

  const partialClose = (value: string): number => {
    const lt = value.lastIndexOf("<");
    if (lt === -1) return -1;
    const slice = value.slice(lt);
    if ("</think>".startsWith(slice)) return lt;
    return -1;
  };

  return {
    push(chunk: string): { thinking: string; content: string } {
      pending += chunk;
      let thinking = "";
      let content = "";

      while (pending.length > 0) {
        if (!inThink) {
          const start = pending.indexOf("<think>");
          if (start === -1) {
            const hold = partialOpen(pending);
            if (hold !== -1) {
              content += pending.slice(0, hold);
              pending = pending.slice(hold);
              break;
            }
            content += pending;
            pending = "";
            break;
          }
          content += pending.slice(0, start);
          pending = pending.slice(start + "<think>".length);
          inThink = true;
          continue;
        }

        const end = pending.indexOf("</think>");
        if (end === -1) {
          const hold = partialClose(pending);
          if (hold !== -1) {
            thinking += pending.slice(0, hold);
            pending = pending.slice(hold);
            break;
          }
          thinking += pending;
          pending = "";
          break;
        }
        thinking += pending.slice(0, end);
        pending = pending.slice(end + "</think>".length).replace(/^\s*\n/, "");
        inThink = false;
      }

      return { thinking, content };
    },
    flush(): { thinking: string; content: string } {
      if (!pending) return { thinking: "", content: "" };
      if (inThink) {
        const thinking = pending;
        pending = "";
        return { thinking, content: "" };
      }
      const content = pending;
      pending = "";
      return { thinking: "", content };
    },
  };
}

export function stripThinkingForMarkdown(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}
