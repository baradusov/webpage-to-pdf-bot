const extractUrlsFromEntities = (entities, text) => {
  if (!entities) return [];

  return entities
    .filter((entity) => entity.type === 'url' || entity.type === 'text_link')
    .map((entity) => {
      if (entity.type === 'text_link') {
        return entity.url;
      }
      return text.substring(entity.offset, entity.offset + entity.length);
    });
};

export const getUrls = (message) => {
  const urls = [
    ...extractUrlsFromEntities(message.entities, message.text),
    ...extractUrlsFromEntities(message.caption_entities, message.caption),
  ];

  return urls.length > 0 ? urls : null;
};
