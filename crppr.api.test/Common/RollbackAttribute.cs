using System;
using System.Transactions;
using NUnit.Framework;
using NUnit.Framework.Interfaces;

namespace crppr.api.test.Common {
    public class RollbackAttribute : Attribute, ITestAction {
        private TransactionScope? _transaction;

        public void BeforeTest(ITest test) {
            _transaction = new TransactionScope(
                TransactionScopeOption.Required,
                TransactionScopeAsyncFlowOption.Enabled
            );
        }

        public void AfterTest(ITest test) {
            _transaction?.Dispose();
        }

        public ActionTargets Targets => ActionTargets.Test;
    }
}
