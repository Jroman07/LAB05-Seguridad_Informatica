describe('Registro de errores del chat', () => {
  let previousDsn;
  beforeEach(() => {
    previousDsn = process.env.SENTRY_DSN;
    jest.resetModules();
  });
  afterEach(() => {
    if (previousDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = previousDsn;
    jest.dontMock('@sentry/node');
    jest.resetModules();
  });

  test('sin DSN no carga el SDK ni envía eventos', () => {
    delete process.env.SENTRY_DSN;
    const load = jest.fn(() => {throw new Error('No debe cargar el SDK');});
    jest.doMock('@sentry/node', load);
    expect(() => require('../../libs/error-reporting').captureChatError(new Error('Prueba'))).not.toThrow();
    expect(load).not.toHaveBeenCalled();
  });

  test('captura la excepción y elimina datos de la conversación del evento', () => {
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';
    const sdk = {
      init: jest.fn(), captureException: jest.fn(),
      contextLinesIntegration: jest.fn(), onUncaughtExceptionIntegration: jest.fn(),
      onUnhandledRejectionIntegration: jest.fn()
    };
    jest.doMock('@sentry/node', () => sdk);
    const reporting = require('../../libs/error-reporting');
    const error = new Error('Contenido no permitido');
    reporting.captureChatError(error);
    expect(sdk.captureException).toHaveBeenCalledWith(error, expect.objectContaining({
      tags: expect.objectContaining({operation: 'procesar_mensaje'})
    }));
    const options = sdk.init.mock.calls[0][0];
    expect(options.tracesSampleRate).toBe(0);
    expect(options.enableLogs).toBe(false);
    const event = {exception: {values: []}, request: {data: 'mensaje'}, user: {id: 'usuario'},
      breadcrumbs: [{message: 'mensaje'}], extra: {token: 'privado'}};
    expect(options.beforeSend(event)).toEqual({exception: {values: []}});
  });

  test('un fallo del SDK no interrumpe el manejo del mensaje', () => {
    process.env.SENTRY_DSN = 'https://public@example.invalid/1';
    jest.doMock('@sentry/node', () => ({
      init: jest.fn(), captureException() {throw new Error('Sin conexión');},
      contextLinesIntegration: jest.fn(), onUncaughtExceptionIntegration: jest.fn(),
      onUnhandledRejectionIntegration: jest.fn()
    }));
    const reporting = require('../../libs/error-reporting');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {expect(() => reporting.captureChatError(new Error('Prueba'))).not.toThrow();}
    finally {consoleSpy.mockRestore();}
  });
});
