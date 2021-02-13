module.exports = async (handler) => {
  const data = new Promise((resolve) => {
    resolve(handler());
  });

  const timeout = new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          pdf: false,
          message:
            "Can't handle it, the webpage is too big. Try sending it to me again, sometimes it helps.",
        }),
      15000
    );
  });

  const { pdf, name, message } = await Promise.race([data, timeout]);

  return { pdf, name, message };
};
