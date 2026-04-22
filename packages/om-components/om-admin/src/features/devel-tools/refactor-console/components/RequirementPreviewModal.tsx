import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Code, FileCode, ExternalLink } from '@/ui/icons';
import { FileAnalysis, EndpointReference, ASTIntegrationPoint } from '@/types/refactorConsole';

// Browser-compatible path utilities
const pathBasename = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || '/';
};

const pathExtname = (filePath: string): string => {
  const basename = pathBasename(filePath);
  const lastDot = basename.lastIndexOf('.');
  return lastDot >= 0 ? basename.slice(lastDot) : '';
};

interface RequirementPreviewModalProps {
  fileAnalysis: FileAnalysis | null;
  integrationPoints: {
    menuItems: ASTIntegrationPoint | null;
    router: ASTIntegrationPoint | null;
  };
  onClose: () => void;
}

const RequirementPreviewModal: React.FC<RequirementPreviewModalProps> = ({
  fileAnalysis,
  integrationPoints,
  onClose
}) => {
  if (!fileAnalysis) return null;

  const { file, imports, endpoints } = fileAnalysis;
  const allImportsResolved = imports.every(imp => imp.resolved);
  const allEndpointsVerified = endpoints.every(ep => ep.existsInServer);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Requirement Preview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{file.relPath}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Information */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">File Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`ml-2 font-medium ${
                  file.status === 'missing_in_target' ? 'text-purple-600' : 'text-orange-600'
                }`}>
                  {file.status === 'missing_in_target' ? 'Missing in Target' : 'Modified in Target'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Size:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{(file.size / 1024).toFixed(2)} KB</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Source Path:</span>
                <span className="ml-2 font-mono text-xs text-gray-900 dark:text-gray-100">{file.sourcePath}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Target Path:</span>
                <span className="ml-2 font-mono text-xs text-gray-900 dark:text-gray-100">{file.targetPath || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Dependency Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Code className="w-5 h-5" />
                Import Dependencies
              </h3>
              {allImportsResolved ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  All Resolved
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertCircle className="w-4 h-4" />
                  Some Unresolved
                </span>
              )}
            </div>
            
            {imports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No imports found</p>
            ) : (
              <div className="space-y-2">
                {imports.map((imp, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      imp.resolved
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {imp.resolved ? (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          )}
                          <code className="text-sm font-mono text-gray-900 dark:text-gray-100">{imp.importPath}</code>
                        </div>
                        {imp.resolved && imp.resolvedPath && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                            → {imp.resolvedPath}
                          </p>
                        )}
                        {!imp.resolved && imp.error && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 ml-6">
                            Error: {imp.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Endpoint Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                API Endpoints
              </h3>
              {endpoints.length > 0 && (
                <span className={`flex items-center gap-1 ${
                  allEndpointsVerified ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {allEndpointsVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      All Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Some Missing
                    </>
                  )}
                </span>
              )}
            </div>
            
            {endpoints.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No endpoints referenced in documentation</p>
            ) : (
              <div className="space-y-2">
                {endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      endpoint.existsInServer
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {endpoint.existsInServer ? (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          )}
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {endpoint.method} {endpoint.path}
                          </span>
                        </div>
                        {endpoint.existsInServer && endpoint.routeFile && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                            Found in: {endpoint.routeFile}
                          </p>
                        )}
                        {!endpoint.existsInServer && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 ml-6">
                            Not found in server routes
                          </p>
                        )}
                        {endpoint.foundInDocs.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                            Referenced in: {endpoint.foundInDocs.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integration Points */}
          {(integrationPoints.menuItems || integrationPoints.router) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Integration Points
              </h3>
              
              <div className="space-y-4">
                {integrationPoints.menuItems && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300">MenuItems.ts</h4>
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Line {integrationPoints.menuItems.lineNumber}
                      </span>
                    </div>
                    <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border border-blue-100 dark:border-blue-800 overflow-x-auto text-gray-900 dark:text-gray-100">
                      <code>{integrationPoints.menuItems.codeBlock}</code>
                    </pre>
                  </div>
                )}

                {integrationPoints.router && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300">Router.tsx</h4>
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Line {integrationPoints.router.lineNumber}
                      </span>
                    </div>
                    <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border border-blue-100 dark:border-blue-800 overflow-x-auto text-gray-900 dark:text-gray-100">
                      <code>{integrationPoints.router.codeBlock}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Projected Code Blocks */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Projected Integration Code</h3>
            
            <div className="space-y-4">
              {integrationPoints.router && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Router.tsx Addition</h4>
                  <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-4 rounded overflow-x-auto">
                    <code>{`// Add to Router.tsx (around line ${integrationPoints.router.lineNumber})
{
  path: '/apps/${file.relPath.replace(/\.(tsx?|jsx?)$/, '').replace(/\\//g, '/')}',
  element: <${getComponentName(file.relPath)} />,
}`}</code>
                  </pre>
                </div>
              )}

              {integrationPoints.menuItems && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">MenuItems.ts Addition</h4>
                  <pre className="text-xs bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 p-4 rounded overflow-x-auto">
                    <code>{`// Add to MenuItems array (around line ${integrationPoints.menuItems.lineNumber})
{
  label: '${getMenuLabel(file.relPath)}',
  path: '/apps/${file.relPath.replace(/\.(tsx?|jsx?)$/, '').replace(/\\//g, '/')}',
  icon: 'FileCode', // Update with appropriate icon
}`}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getComponentName(relPath: string): string {
  const basename = pathBasename(relPath);
  return basename.replace(/\.(tsx?|jsx?)$/, '');
}

function getMenuLabel(relPath: string): string {
  const basename = pathBasename(relPath);
  const name = basename.replace(/\.(tsx?|jsx?)$/, '');
  return name.replace(/([A-Z])/g, ' $1').trim();
}

export default RequirementPreviewModal;
