#pragma once
#include "jqutil_v2/JQDefs.h"
#include "jqutil_v2/JQSignal.h"
#include "jqutil_v2/JQProperty.h"
#include "jqutil_v2/JQDefs.h"
#include "jqutil_v2/JQFuncDef.h"
#include "jqutil_v2/JQSerializer.h"
#include "jqutil_v2/JQBaseObject.h"
#include "jqutil_v2/JQBaseObjectExt.h"
#include "jqutil_v2/JQAsyncSchedule.h"
#include "jqutil_v2/JQRefCpp.h"
#include "utils/Mutex.h"

#include <map>
#include <vector>
#include <string>
#include <functional>
#include <assert.h>

// JQTemplate(JQObjectTemplate/ JQFunctionTemplate)
#define JQ_REFS_TPL_INDEX 0
// JQBaseObject
#define JQ_REFS_CPP_INDEX 1

// === JQTemplate START ===

namespace JQUTIL_NS {

class JQTemplate: public JQuick::REF_BASE {
public:
    JQTemplateEnvRef tplEnv() const;
    std::string appid() const;
    std::string moduleName() const;
    JQuick::sp<JQuick::Handler> jsHandler() const;
    inline JSContext* context() const { return _tplCtx; }

protected:
    JQTemplate(JQTemplateEnvRef env);
    virtual ~JQTemplate();

protected:
    JSContext *_tplCtx;
    JSRuntime *_tplRT;
    JQTemplateEnvRef _tplEnv;
};
// === JQTemplate END ===

// === JQObjectTemplate START ===

#define JQ_PROP_DEF JS_PROP_C_W_E

typedef enum {
    JQ_PROPERTY_UNKNOWN = 0,
    JQ_ACCESSOR_CFUNCTION = 1,  // JSValue func(JSContext *ctx, JSValueConst this_value, int argc, JSValueConst *argv)
    JQ_ACCESSOR_CFUNCTION_CALLBACK,  // void func(JQFunctionInfo &info)
    JQ_ACCESSOR_FUNCTION_TEMPLATE,
    JQ_ACCESSOR_FUNCTION_CALLBACK,  // std::function<void(JQFunctionInfo &info)>

    JQ_PROPERTY_CFUNCTION,
    JQ_PROPERTY_CFUNCTION_CALLBACK,
    JQ_PROPERTY_FUNCTION_TEMPLATE,
    JQ_PROPERTY_FUNCTION_CALLBACK,

    JQ_PROPERTY_OBJECT_TEMPLATE,

    JQ_PROPERTY_TYPE_BOOL,
    JQ_PROPERTY_TYPE_INT32,
    JQ_PROPERTY_TYPE_UINT32,
    JQ_PROPERTY_TYPE_DOUBLE,
    JQ_PROPERTY_TYPE_STRING,

    JQ_PROPERTY_SIGNAL,
    JQ_PROPERTY_PROPERTY,

    JQ_PROPERTY_ASYNC_CALLBACK,  // same as JQCallbackType_Simple
    JQ_PROPERTY_ASYNC_STD_CALLBACK,  // same as JQCallbackType_Std
    JQ_PROPERTY_PROMISE_CALLBACK,  // same as JQCallbackType_Resolve/Reject
} JQObjectPropertyType;

class JQPrepareInfo {
public:
    JQBaseObject* cppObj() const { return _cppObj; }
    JQAsyncInfo& asyncInfo() const { return *_info; }
    JSContext* context() const { return _ctx; }
    int argc() const { return _argc; }
    JSValueConst* argv() const { return _argv; }

private:
    friend class JQObjectTemplate;
    JQBaseObject* _cppObj;
    JQAsyncInfo* _info;
    JSContext *_ctx;
    int _argc;
    JSValueConst *_argv;
};

using JQPrepareParamsHookFunc = std::function<bool(JQPrepareInfo &info)>;
using JQPrepareCallbackidHookFunc = std::function<uint32_t(JQPrepareInfo &info)>;

class JQObjectProperty {
public:

public:
    JQObjectProperty();
    ~JQObjectProperty();

    template <typename T>
    inline JQObjectProperty& SetPrepareParamsHook(bool (T::* hook)(JQPrepareInfo &info))
    {
        return SetPrepareParamsHook([hook](JQPrepareInfo &info) {
            T* obj = (T*)info.cppObj();
            return (obj->*hook)(info);
        });
    }

    inline JQObjectProperty& SetPrepareParamsCHook(bool (*func)(JQPrepareInfo &info))
    {
        return SetPrepareParamsHook([func](JQPrepareInfo &info) {
          return func(info);
        });
    }

    inline JQObjectProperty& SetPrepareParamsHook(JQPrepareParamsHookFunc func)
    {
        prepareParamsHook = func; return *this;
    }

    template <typename T>
    inline JQObjectProperty& SetPrepareCallbackidHook(uint32_t (T::* hook)(JQPrepareInfo &info))
    {
        return SetPrepareCallbackidHook([hook](JQPrepareInfo &info) {
            T* obj = (T*)info.cppObj();
            return (obj->*hook)(info);
        });
    }

    inline JQObjectProperty& SetPrepareCallbackidCHook(uint32_t (*func)(JQPrepareInfo &info))
    {
        return SetPrepareCallbackidHook([func](JQPrepareInfo &info) {
            return func(info);
        });
    }

    inline JQObjectProperty& SetPrepareCallbackidHook(JQPrepareCallbackidHookFunc func)
    {
        prepareCallbackidHook = func; return *this;
    }

    std::string getName(JSContext *ctx) const;

public:
    JSAtom prop;
    // accessor: get/ set
    // func property: get
    JQObjectPropertyType type;

    union {
        JSCFunction* jsc_func;
        JQFunctionCallback* jq_func_cb;
    } get_cfunc;

    JQFunctionTemplateRef get_tpl;

    union {
        JSCFunction* jsc_func;
        JQFunctionCallback* jq_func_cb;
    } set_cfunc;

    JQFunctionTemplateRef set_tpl;

    JQFunctionCallbackType get_cb;
    JQFunctionCallbackType set_cb;

    int flags=JQ_PROP_DEF;

    // primitive types

    union {
        bool boolVal;
        int32_t int32Val;
        uint32_t uint32Val;
        double doubleVal;
    } u;

    JQObjectTemplateRef objTpl;
    std::string strVal;

    // signal binder function
    std::function<void(JQBaseObject* cppObj, JSAtom prop)> signalBinder;

    // JQProperty functions
    JQFunctionCallbackType prop_set_cfunc;
    JQFunctionCallbackType prop_get_cfunc;

    // async function
    JQAsyncCallbackType async_cb;

    JQPrepareParamsHookFunc prepareParamsHook;
    JQPrepareCallbackidHookFunc prepareCallbackidHook;
};

class JQObjectTemplate: public JQTemplate {
protected:
    // bind to TgtClass.<method>
    static JSValue Caller(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv, int magic,
                                  int isGetterSetter/* 0 getter/ 1 setter*/,
                                  JSValueConst *refs);
    static JSValue FuncCaller(JSContext *ctx, JSValueConst this_val,
            int argc, JSValueConst *argv, int magic, JSValueConst *func_data);
    static JSValue SetterCaller(JSContext *ctx, JSValueConst this_val,
            int argc, JSValueConst *argv, int magic, JSValueConst *func_data);
    static JSValue GetterCaller(JSContext *ctx, JSValueConst this_val,
            int argc, JSValueConst *argv, int magic, JSValueConst *func_data);

    // for interface uniform, but not required
    JQObjectTemplate(JQTemplateEnvRef env);
    ~JQObjectTemplate();

    void injectProperties(JSValueConst result, int refsCount, JSValueConst *refs, JQBaseObject* cppObj);

public:
    static JQObjectTemplateRef New(JQTemplateEnvRef env);

    JSValue NewInstance(bool forceCreateCppObj=false);

    // === SetAccessor START ===
    JQObjectProperty& SetAccessor(JSAtom prop, JSCFunction getter, JSCFunction setter);
    JQObjectProperty& SetAccessor(JSAtom prop, JQFunctionCallback getter, JQFunctionCallback setter);

    // helper: support string prop
    inline JQObjectProperty& SetAccessor(const char* prop, JSCFunction getter, JSCFunction setter)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = SetAccessor(prop1, getter, setter); JS_FreeAtom(_tplCtx, prop1); return result; }

    // helper: support string prop
    inline JQObjectProperty& SetAccessor(const char* prop, JQFunctionCallback getter, JQFunctionCallback setter)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = SetAccessor(prop1, getter, setter); JS_FreeAtom(_tplCtx, prop1); return result; }

    // support JQFunctionTemplate
    JQObjectProperty& SetAccessor(JSAtom prop, JQFunctionTemplateRef getter, JQFunctionTemplateRef setter);

    // helper: support string prop, must implement in cpp
    inline JQObjectProperty& SetAccessor(const char* prop, JQFunctionTemplateRef getter, JQFunctionTemplateRef setter);

    // support FuncType
    JQObjectProperty& SetAccessor(JSAtom prop, JQFunctionCallbackType getter, JQFunctionCallbackType setter);

    inline JQObjectProperty& SetAccessor(const char* prop, JQFunctionCallbackType getter, JQFunctionCallbackType setter)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = SetAccessor(prop1, getter, setter); JS_FreeAtom(_tplCtx, prop1); return result; }

    // support JQFunctionCallbackType of some class member functions
    template <typename T>
    inline JQObjectProperty& SetAccessor(JSAtom prop,
                            void(T::* getter)(JQFunctionInfo&),
                            void(T::* setter)(JQFunctionInfo&))
    {
        JQObjectProperty& result = SetAccessor(prop, [getter](JQFunctionInfo& info) {
          T* obj = info.UnwrapHolder<T>();
          assert(obj != NULL);
          (obj->*getter)(info);
        }, [setter](JQFunctionInfo& info) {
          T* obj = info.UnwrapHolder<T>();
          assert(obj != NULL);
          (obj->*setter)(info);
        });
        return result;
    }

    template <typename T>
    inline JQObjectProperty& SetAccessor(const char* prop,
        void(T::* getter)(JQFunctionInfo&),
        void(T::* setter)(JQFunctionInfo&))
    {
        JSAtom prop1 = JS_NewAtom(_tplCtx, prop);
        JQObjectProperty& result = SetAccessor(prop1, [getter](JQFunctionInfo& info) {
          T* obj = info.UnwrapHolder<T>();
          assert(obj != NULL);
          (obj->*getter)(info);
        }, [setter](JQFunctionInfo& info) {
          T* obj = info.UnwrapHolder<T>();
          assert(obj != NULL);
          (obj->*setter)(info);
        });
        JS_FreeAtom(_tplCtx, prop1);
        return result;
    }
    // === SetAccessor END ===

    // === SetProperty START ===
    // some JQFunctionCallbackType property
    JQObjectProperty& Set(JSAtom prop, JSCFunction func);
    JQObjectProperty& Set(JSAtom prop, JQFunctionCallback func);
    JQObjectProperty& Set(JSAtom prop, JQFunctionCallbackType func);
    inline JQObjectProperty& Set(const char* prop, JSCFunction func)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& p = Set(prop1, func); JS_FreeAtom(_tplCtx, prop1); return p; }
    inline JQObjectProperty& Set(const char* prop, JQFunctionCallback func)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& p = Set(prop1, func); JS_FreeAtom(_tplCtx, prop1); return p; }
    inline JQObjectProperty& Set(const char* prop, JQFunctionCallbackType func)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& p = Set(prop1, func); JS_FreeAtom(_tplCtx, prop1); return p; }

    // support JQFunctionCallbackType of some class member functions
    template <typename T>
    inline JQObjectProperty& Set(JSAtom prop, void(T::* func)(JQFunctionInfo&))
    {
        return Set(prop, [func](JQFunctionInfo& info) {
          T* obj = info.UnwrapHolder<T>();
          assert(obj != NULL);
          (obj->*func)(info);
        });
    }

    template <typename T>
    inline JQObjectProperty& Set(const char* prop, void(T::* func)(JQFunctionInfo&))
    {
        return Set(prop, [func](JQFunctionInfo& info) {
          T* obj = info.UnwrapHolder<T>();
          assert(obj != NULL);
          (obj->*func)(info);
        });
    }

    // The property must be defined either as a primitive value, or a template.
    // property of JQFunctionTemplate
    JQObjectProperty& Set(JSAtom prop, JQFunctionTemplateRef tpl);
    JQObjectProperty& Set(const char* prop, JQFunctionTemplateRef tpl);

    // property of JQObjectTemplate
    JQObjectProperty& Set(JSAtom prop, JQObjectTemplateRef tpl);
    inline JQObjectProperty& Set(const char* prop, JQObjectTemplateRef tpl)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = Set(prop1, tpl); JS_FreeAtom(_tplCtx, prop1); return result; }

    // bool
    JQObjectProperty& SetBool(JSAtom prop, bool val);
    inline JQObjectProperty& SetBool(const char* prop, bool val)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = SetBool(prop1, val); JS_FreeAtom(_tplCtx, prop1); return result; }
    // int32
    JQObjectProperty& Set(JSAtom prop, int32_t val);
    inline JQObjectProperty& Set(const char* prop, int32_t val)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = Set(prop1, val); JS_FreeAtom(_tplCtx, prop1); return result; }
    // uint32
    JQObjectProperty& Set(JSAtom prop, uint32_t val);
    inline JQObjectProperty& Set(const char* prop, uint32_t val)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = Set(prop1, val); JS_FreeAtom(_tplCtx, prop1); return result; }
    // double
    JQObjectProperty& Set(JSAtom prop, double val);
    inline JQObjectProperty& Set(const char* prop, double val)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = Set(prop1, val); JS_FreeAtom(_tplCtx, prop1); return result; }
    // string
    JQObjectProperty& Set(JSAtom prop, const std::string &val);
    inline JQObjectProperty& Set(const char* prop, const std::string &val)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty& result = Set(prop1, val); JS_FreeAtom(_tplCtx, prop1); return result; }

    // JQSignal
    template <typename T, typename... Args>
    JQObjectProperty& Set(const char* prop, JQSignal<Args...> T::* signal)
    {
        JSAtom prop1 = JS_NewAtom(_tplCtx, prop);
        std::function<void(JQBaseObject*, JSAtom)> signalBinder = [=](JQBaseObject *cppObj, JSAtom prop) {
            T* obj = (T*)cppObj;
            (obj->*signal).connect_member_magic(obj, &JQBaseObject::_OnSignalMagic, JQ_SIGNAL_CONN_TYPE_AUTO, (intptr_t)prop);
        };
        JQObjectProperty p; p.type=JQ_PROPERTY_SIGNAL, p.signalBinder=signalBinder;
        JQObjectProperty& result = _setProperty(prop1, p);
        JS_FreeAtom(_tplCtx, prop1);
        return result;
    }

    // JQProperty
    template <typename T, typename T1>
    JQObjectProperty& Set(const char* prop, JQProperty<T1> T::* property)
    {
        JSAtom prop1 = JS_NewAtom(_tplCtx, prop);
        std::function<void(JQBaseObject*, JSAtom)> signalBinder = [=](JQBaseObject *cppObj, JSAtom prop) {
            T* obj = (T*)cppObj;
            (obj->*property).on_change().connect_member_magic(obj, &JQBaseObject::_OnSignalMagic, JQ_SIGNAL_CONN_TYPE_AUTO, (intptr_t)prop);
        };
        JQFunctionCallbackType prop_set_cfunc = [=](JQFunctionInfo &info) {
            JSContext *ctx = info.GetContext();
            T* obj = info.UnwrapHolder<T>();
            T1 o;
            if (!JQSerializer<T1>::deserialize(ctx, info[0], &o)) {
                jq_dump_error(ctx);
                info.GetReturnValue().ThrowTypeError("invalid type");
                return;
            }
            (obj->*property).set(o);
        };
        JQFunctionCallbackType prop_get_cfunc = [=](JQFunctionInfo &info) {
            JSContext *ctx = info.GetContext();
            T* obj = info.UnwrapHolder<T>();
            info.GetReturnValue().Set(JQSerializer<T1>::serialize(ctx, (obj->*property).get()));
        };
        JQObjectProperty p;
        p.type=JQ_PROPERTY_PROPERTY, p.signalBinder=signalBinder,
            p.prop_set_cfunc = prop_set_cfunc, p.prop_get_cfunc = prop_get_cfunc;
        JQObjectProperty& result = _setProperty(prop1, p);
        JS_FreeAtom(_tplCtx, prop1);
        return result;
    }

    // async
    inline JQObjectProperty& SetAsync(JSAtom prop, JQAsyncCallbackType func)
    { return _SetAsync(prop, func); }
    inline JQObjectProperty& SetAsync(const char* prop, JQAsyncCallbackType func)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty &p = _SetAsync(prop1, func); JS_FreeAtom(_tplCtx, prop1); return p; }
    inline JQObjectProperty& SetAsyncStd(JSAtom prop, JQAsyncCallbackType func)
    { return _SetAsyncStd(prop, func); }
    inline JQObjectProperty& SetAsyncStd(const char* prop, JQAsyncCallbackType func)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty &p =  _SetAsyncStd(prop1, func); JS_FreeAtom(_tplCtx, prop1); return p; }
    inline JQObjectProperty& SetPromise(JSAtom prop, JQAsyncCallbackType func)
    { return _SetPromise(prop, func); }
    inline JQObjectProperty& SetPromise(const char* prop, JQAsyncCallbackType func)
    { JSAtom prop1 = JS_NewAtom(_tplCtx, prop); JQObjectProperty &p =  _SetPromise(prop1, func); JS_FreeAtom(_tplCtx, prop1); return p; }

    inline void setObjectCreator(JQBaseObject::CreatorType objCreator) { _objCreator = objCreator; };
    inline JQBaseObject::CreatorType getObjectCreator() const { return _objCreator; };

    // get function name when this object is generate from a function ctor
    std::string functionName() const;

    void setAsyncScheduleMode(int mode);
    void setAsyncScheduleHook(JQAsyncScheduleHook hook);

    JQObjectTemplateRef clone() const;

protected:
    JQObjectProperty& _SetAsync(JSAtom prop, JQAsyncCallbackType func);
    JQObjectProperty& _SetAsyncStd(JSAtom prop, JQAsyncCallbackType func);
    JQObjectProperty& _SetPromise(JSAtom prop, JQAsyncCallbackType func);
    JQObjectProperty& _setProperty(JSAtom prop, JQObjectProperty &property);
    bool _hasAsyncProperty() const;

protected:
    JQInternalValueHolder* getOrCreateInternalValueHolder(uintptr_t objPtr);
    JQInternalValueHolder* getInternalValueHolder(uintptr_t objPtr) const;
    void collectAndDestroyInternalValueHolder(uintptr_t objPtr, JSContext *ctx);

    JQInternalRefHolder* getOrCreateInternalRefHolder(uintptr_t objPtr);
    JQInternalRefHolder* getInternalRefHolder(uintptr_t objPtr) const;
    void destroyInternalRefHolder(uintptr_t objPtr);

    JQAsyncExecutor* getOrCreateAsyncExecutor(uintptr_t objPtr);
    JQAsyncExecutor* getAsyncExecutor(uintptr_t objPtr) const;
    void destroyAsyncExecutor(uintptr_t objPtr);

    friend class JQObjectSignalRegister;
    JQObjectSignalRegister* getOrCreateSignalRegister(uintptr_t objPtr);
    JQObjectSignalRegister* getSignalRegister(uintptr_t objPtr) const;
    void collectSignalRegister(uintptr_t objPtr, JSContext *ctx);
    void destroySignalRegister(uintptr_t objPtr);

    JQObjectGCRegister* getOrCreateGCRegister(uintptr_t objPtr);
    JQObjectGCRegister* getGCRegister(uintptr_t objPtr) const;
    void collectAndDestroyGCRegister(uintptr_t objPtr, JSContext* ctx);

protected:
    friend class JQFunctionTemplate;
    friend class JQBaseObject;
    friend class JQFunctionInfo;

    std::map<JSAtom, JQObjectProperty> _propertyMap;

    JQBaseObject::CreatorType _objCreator;

    JQWRef<JQFunctionTemplate> _funcTpl;

    JQAsyncSchedule _asyncSchedule;

    std::map<uintptr_t, JQInternalValueHolder*> _objInternalValueHolderMap;
    std::map<uintptr_t, JQInternalRefHolder*> _objInternalRefHolderMap;
    std::map<uintptr_t, JQAsyncExecutor*> _objAsyncExecutorMap;
    std::map<uintptr_t, JQObjectSignalRegister*> _objSignalRegisterMap;
    std::map<uintptr_t, JQObjectGCRegister*> _objGCRegisterMap;

    mutable JQuick::Mutex _mutex;
};

// === JQObjectTemplate END ===

// dirty position for JQBaseObject implement
template <typename... Args>
void JQBaseObject::_OnSignalMagic(intptr_t magic, Args... args)
{
    if (!isAttached()) {
        return;
    }

    JQObjectSignalRegister *signalRegister = _objTpl->getSignalRegister((uintptr_t)this);
    if (!signalRegister) {
        return;
    }

    uint32_t prop = (uint32_t)magic;

    // checking existence of callbacks
    auto iter = signalRegister->_signalListenersMap.find(prop);
    if (iter == signalRegister->_signalListenersMap.end()) {
        return;
    }
    if (iter->second.size() == 0) {
        return;
    }

    JSContext *ctx = _objTpl->context();
    // serialize
    std::vector<JSValue> arr;
    int dummy[] = { (JQSerializeEach(ctx, std::forward<Args>(args), arr), 0)... };
    static_cast<void>(dummy);

    signalRegister->_signalDoPublish(prop, ctx, arr);

    for (JSValue val: arr) {
        JS_FreeValue(ctx, val);
    }
}

}  // namespace JQUTIL_NS
