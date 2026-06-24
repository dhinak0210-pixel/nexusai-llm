/**
 * Helper utility to parse and extract artifacts from chat messages
 */

export function extractArtifacts(messages) {
  const artifacts = [];
  if (!messages || messages.length === 0) return artifacts;

  messages.forEach((msg) => {
    if (msg.role !== 'assistant' || !msg.content) return;

    // Matches markdown code blocks like:
    // ```html
    // ...
    // ```
    // OR annotated blocks like ```html:title=Interactive App
    const regex = /```(\w+)(?::(?:title|filename)=([^\n]+)|:([^\n]+))?\n([\s\S]*?)(?:```|$)/gi;
    let match;
    let index = 0;

    while ((match = regex.exec(msg.content)) !== null) {
      const type = match[1].toLowerCase();
      // Extract title: match[2] or match[3] or default friendly title
      let title = match[2] || match[3] || '';
      title = title.trim();

      const rawContent = match[4];
      const content = rawContent ? rawContent.trim() : '';

      // Skip empty code blocks or generic types that don't need rendering
      const supportedTypes = ['html', 'svg', 'xml', 'react', 'javascript', 'python', 'css', 'json', 'mermaid'];
      if (!supportedTypes.includes(type) || !content) continue;

      if (!title) {
        if (type === 'html') title = `Web Preview`;
        else if (type === 'svg') title = `Vector Illustration`;
        else if (type === 'react') title = `React Component`;
        else if (type === 'mermaid') title = `Diagram`;
        else title = `${type.toUpperCase()} Code`;

        title = `${title} ${index + 1}`;
      }

      const id = `${msg.id || 'msg'}-${index}`;
      artifacts.push({
        id,
        messageId: msg.id,
        type,
        title,
        content,
      });

      index++;
    }
  });

  return artifacts;
}
