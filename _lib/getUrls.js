const hasCaptionEntities = (message) => message.caption_entities || null;
const hasEntities = (message) => message.entities || null;

export const getUrls = (message) => {
  let urls = [];

  if (hasEntities(message)) {
    const linkEntities = message.entities.filter(
      (entity) => entity.type === 'url' || entity.type === 'text_link'
    );

    for (const linkEntity of linkEntities) {
      if (linkEntity.type === 'url') {
        urls.push(
          message.text.substring(
            linkEntity.offset,
            linkEntity.offset + linkEntity.length
          )
        );
      } else if (linkEntity.type === 'text_link') {
        urls.push(linkEntity.url);
      }
    }
  }

  if (hasCaptionEntities(message)) {
    const linkCaptionEntities = message.caption_entities.filter(
      (entity) => entity.type === 'url' || entity.type === 'text_link'
    );

    for (const linkCaptionEntity of linkCaptionEntities) {
      if (linkCaptionEntity.type === 'url') {
        urls.push(
          message.caption.substring(
            linkCaptionEntity.offset,
            linkCaptionEntity.offset + linkCaptionEntity.length
          )
        );
      } else if (linkCaptionEntity.type === 'text_link') {
        urls.push(linkCaptionEntity.url);
      }
    }
  }

  return urls.length > 0 ? urls : null;
};
